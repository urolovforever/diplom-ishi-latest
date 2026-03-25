import difflib
from datetime import timedelta

from django.db.models import Q, Count
from django.http import FileResponse
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Role
from accounts.permissions import IsSuperAdmin
from accounts.security import get_client_ip
from audit.mixins import AuditMixin
from .encryption import encrypt_file, decrypt_file
from .honeypot import HoneypotManager
from confessions.models import Organization
from notifications.services import NotificationService
from .models import Document, DocumentShare, DocumentVersion, DocumentAccessLog, HoneypotFile
from .permissions import (
    SECURITY_LEVEL_HIERARCHY, ROLE_MAX_SECURITY_LEVEL,
    filter_by_security_level, requires_download_confirmation,
)
from .serializers import (
    DocumentListSerializer, DocumentWriteSerializer,
    DocumentVersionSerializer, DocumentAccessLogSerializer,
    DocumentShareSerializer, HoneypotFileSerializer,
)

DAILY_DOWNLOAD_ALERT_THRESHOLD = 50


def _check_download_limit(user):
    """Check if user exceeded daily download limit and create alert if so."""
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    download_count = DocumentAccessLog.objects.filter(
        user=user,
        action='download',
        created_at__gte=today_start,
    ).count()

    if download_count >= DAILY_DOWNLOAD_ALERT_THRESHOLD:
        from notifications.models import Notification
        from accounts.models import CustomUser

        admins = CustomUser.objects.filter(
            role__name__in=[Role.SUPER_ADMIN],
            is_active=True,
        )
        for admin in admins:
            # Avoid duplicate alerts for same user/day
            existing = Notification.objects.filter(
                recipient=admin,
                title__contains=f'{user.email} exceeded download limit',
                created_at__gte=today_start,
            ).exists()
            if not existing:
                Notification.objects.create(
                    recipient=admin,
                    title=f'{user.email} exceeded download limit',
                    message=f'User {user.email} has downloaded {download_count} documents today.',
                    notification_type='alert',
                )


class DocumentListCreateView(AuditMixin, generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ['organization', 'is_encrypted', 'security_level', 'category']

    def get_queryset(self):
        user = self.request.user
        qs = Document.objects.select_related(
            'uploaded_by__role', 'uploaded_by__organization__confession', 'uploaded_by__confession',
        ).prefetch_related(
            'versions', 'encrypted_keys__user', 'shares__organization',
        ).all()
        if user.role and user.role.name == Role.SUPER_ADMIN:
            return filter_by_security_level(qs, user)
        if user.role and user.role.name == Role.KONFESSIYA_RAHBARI:
            q = Q(uploaded_by=user) | Q(organization__leader=user)
            if user.confession:
                # See docs shared with any org in their confession
                org_ids = Organization.objects.filter(
                    confession=user.confession
                ).values_list('id', flat=True)
                q |= Q(shares__organization_id__in=org_ids)
            qs = qs.filter(q).distinct()
            return filter_by_security_level(qs, user)
        q = Q(uploaded_by=user)
        if user.organization:
            q |= Q(shares__organization=user.organization)
        elif user.confession:
            org_ids = Organization.objects.filter(
                confession=user.confession
            ).values_list('id', flat=True)
            q |= Q(shares__organization_id__in=org_ids)
        return filter_by_security_level(qs.filter(q).distinct(), user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DocumentWriteSerializer
        return DocumentListSerializer

    def perform_create(self, serializer):
        instance = serializer.save(uploaded_by=self.request.user)

        # Skip server-side encryption for E2E encrypted documents (already encrypted client-side)
        if not instance.is_e2e_encrypted and instance.is_encrypted and instance.file:
            try:
                instance.file.seek(0)
                content = instance.file.read()
                encrypted = encrypt_file(content)
                instance.file.seek(0)
                from django.core.files.base import ContentFile
                instance.file.save(instance.file.name, ContentFile(encrypted), save=False)
                instance.save()
            except Exception:
                pass  # File saved unencrypted if encryption fails

        DocumentVersion.objects.create(
            document=instance,
            version_number=1,
            file=instance.file,
            change_summary='Initial version',
            created_by=self.request.user,
        )

        # Create DocumentShare entries from shared_with_organizations
        user = self.request.user
        shared_org_ids = getattr(instance, '_shared_org_ids', [])
        for org_id in shared_org_ids:
            try:
                org = Organization.objects.get(pk=org_id)
                DocumentShare.objects.get_or_create(
                    document=instance, organization=org,
                    defaults={'shared_by': user},
                )
            except Organization.DoesNotExist:
                continue

        # Notify members of shared organizations
        sender_name = user.get_full_name() or user.email
        if shared_org_ids:
            from accounts.models import CustomUser
            shared_orgs = Organization.objects.filter(id__in=shared_org_ids)
            for org in shared_orgs:
                for member in org.members.filter(is_active=True).exclude(id=user.id):
                    NotificationService.send_in_app(
                        recipient=member,
                        title='Yangi hujjat yuklandi',
                        message=f'"{instance.title}" hujjati {org.name} ga yuborildi. Yuboruvchi: {sender_name}',
                        notification_type='info',
                    )
        else:
            # Notify members of uploader's own organization/confession
            from accounts.models import CustomUser
            recipients = CustomUser.objects.none()
            if user.organization:
                recipients = user.organization.members.filter(is_active=True)
            elif user.confession:
                recipients = user.confession.members.filter(is_active=True)
            for member in recipients.exclude(id=user.id):
                NotificationService.send_in_app(
                    recipient=member,
                    title='Yangi hujjat yuklandi',
                    message=f'"{instance.title}" hujjati yuklandi. Yuboruvchi: {sender_name}',
                    notification_type='info',
                )

        self._create_audit_log('create', instance)
        return instance


class DocumentDetailView(AuditMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = 'pk'

    def get_queryset(self):
        user = self.request.user
        qs = Document.objects.select_related(
            'uploaded_by__role', 'uploaded_by__organization__confession', 'uploaded_by__confession',
        ).prefetch_related(
            'versions', 'encrypted_keys__user', 'shares__organization',
        ).all()
        if user.role and user.role.name == Role.SUPER_ADMIN:
            return filter_by_security_level(qs, user)
        if user.role and user.role.name == Role.KONFESSIYA_RAHBARI:
            q = Q(uploaded_by=user) | Q(organization__leader=user)
            if user.confession:
                org_ids = Organization.objects.filter(
                    confession=user.confession
                ).values_list('id', flat=True)
                q |= Q(shares__organization_id__in=org_ids)
            qs = qs.filter(q).distinct()
            return filter_by_security_level(qs, user)
        q = Q(uploaded_by=user)
        if user.organization:
            q |= Q(shares__organization=user.organization)
        elif user.confession:
            org_ids = Organization.objects.filter(
                confession=user.confession
            ).values_list('id', flat=True)
            q |= Q(shares__organization_id__in=org_ids)
        return filter_by_security_level(qs.filter(q).distinct(), user)

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return DocumentWriteSerializer
        return DocumentListSerializer

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        instance = self.get_object()
        DocumentAccessLog.objects.create(
            document=instance,
            user=request.user,
            action='view',
            ip_address=get_client_ip(request),
        )
        return response


class DocumentShareView(APIView):
    """Share an existing document with other organizations."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            document = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            return Response({'detail': 'Hujjat topilmadi.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        # Only owner or admin can share
        if document.uploaded_by != user and (
            not user.role or user.role.name != Role.SUPER_ADMIN
        ):
            return Response({'detail': 'Ruxsat berilmagan.'}, status=status.HTTP_403_FORBIDDEN)

        org_ids = request.data.get('organization_ids', [])
        if not org_ids:
            return Response({'detail': 'organization_ids talab qilinadi.'}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        for org_id in org_ids:
            try:
                org = Organization.objects.get(pk=org_id)
                share, is_new = DocumentShare.objects.get_or_create(
                    document=document, organization=org,
                    defaults={'shared_by': user},
                )
                if is_new:
                    created.append(str(org.name))
                    for member in org.members.filter(is_active=True):
                        NotificationService.send_in_app(
                            recipient=member,
                            title='Yangi hujjat ulashildi',
                            message=f'"{document.title}" hujjati {org.name} bilan ulashildi. Yuboruvchi: {user.get_full_name() or user.email}',
                            notification_type='info',
                        )
            except Organization.DoesNotExist:
                continue

        return Response({
            'detail': f'Hujjat {len(created)} ta tashkilotga ulashildi.',
            'shared_with': created,
        }, status=status.HTTP_200_OK)


class DocumentMarkReadView(APIView):
    """Mark received documents as read for the current user's organization."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        doc_ids = request.data.get('ids', [])
        mark_all = request.data.get('all', False)

        org = user.organization
        if not org:
            return Response({'detail': 'ok', 'updated': 0})

        qs = DocumentShare.objects.filter(organization=org, is_read=False)
        if not mark_all and doc_ids:
            qs = qs.filter(document_id__in=doc_ids)

        updated = qs.update(is_read=True)
        return Response({'detail': 'ok', 'updated': updated})


class DocumentDownloadView(APIView):
    """Download a document with confirmation for confidential/secret docs."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            doc = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check if confirmation is needed
        if requires_download_confirmation(doc, request.user):
            confirmed = request.query_params.get('confirmed', 'false').lower() == 'true'
            if not confirmed:
                return Response({
                    'requires_confirmation': True,
                    'message': f'This document has "{doc.security_level}" security level. '
                               'Please confirm download by adding ?confirmed=true',
                    'security_level': doc.security_level,
                }, status=status.HTTP_200_OK)

        # Log download
        DocumentAccessLog.objects.create(
            document=doc,
            user=request.user,
            action='download',
            ip_address=get_client_ip(request),
        )

        # Check daily download limit
        _check_download_limit(request.user)

        if doc.file:
            try:
                response = FileResponse(doc.file.open('rb'))
                response['Content-Type'] = 'application/octet-stream'
                response['Content-Disposition'] = f'attachment; filename="{doc.title}"'
                return response
            except Exception:
                return Response({'detail': 'File not available.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({'detail': 'No file attached.'}, status=status.HTTP_404_NOT_FOUND)


class DocumentVersionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentVersionSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return DocumentVersion.objects.filter(
            document_id=self.kwargs['doc_pk']
        ).select_related('created_by__role')

    def perform_create(self, serializer):
        document = Document.objects.get(pk=self.kwargs['doc_pk'])
        latest = document.versions.first()
        next_version = (latest.version_number + 1) if latest else 1
        serializer.save(
            document=document,
            version_number=next_version,
            created_by=self.request.user,
        )


class DocumentVersionDiffView(APIView):
    """Compare two versions of a document (text-based diff)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_pk):
        v1_num = request.query_params.get('v1')
        v2_num = request.query_params.get('v2')

        if not v1_num or not v2_num:
            return Response(
                {'detail': 'Provide v1 and v2 query params with version numbers.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            v1 = DocumentVersion.objects.get(document_id=doc_pk, version_number=int(v1_num))
            v2 = DocumentVersion.objects.get(document_id=doc_pk, version_number=int(v2_num))
        except DocumentVersion.DoesNotExist:
            return Response({'detail': 'Version not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            v1.file.seek(0)
            v2.file.seek(0)
            v1_content = v1.file.read().decode('utf-8', errors='replace').splitlines()
            v2_content = v2.file.read().decode('utf-8', errors='replace').splitlines()
        except Exception:
            return Response(
                {'detail': 'Cannot compare binary files. Diff only works with text files.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        diff = list(difflib.unified_diff(
            v1_content, v2_content,
            fromfile=f'v{v1_num}', tofile=f'v{v2_num}',
            lineterm='',
        ))

        return Response({
            'v1': int(v1_num),
            'v2': int(v2_num),
            'diff': diff,
            'has_changes': len(diff) > 0,
        })


class DocumentVersionRollbackView(APIView):
    """Rollback a document to a previous version."""
    permission_classes = [IsAuthenticated]

    def post(self, request, doc_pk, version_number):
        try:
            document = Document.objects.get(pk=doc_pk)
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Only owner or admins can rollback
        user = request.user
        if document.uploaded_by != user and (
            not user.role or user.role.name != Role.SUPER_ADMIN
        ):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            target_version = DocumentVersion.objects.get(
                document=document, version_number=version_number,
            )
        except DocumentVersion.DoesNotExist:
            return Response({'detail': 'Version not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Create a new version from the target version's file
        latest = document.versions.first()
        next_num = (latest.version_number + 1) if latest else 1

        new_version = DocumentVersion.objects.create(
            document=document,
            version_number=next_num,
            file=target_version.file,
            change_summary=f'Rolled back to version {version_number}',
            created_by=user,
        )

        # Update document's main file
        document.file = target_version.file
        document.save(update_fields=['file', 'updated_at'])

        # Log access
        DocumentAccessLog.objects.create(
            document=document,
            user=user,
            action='rollback',
            ip_address=get_client_ip(request),
        )

        return Response({
            'detail': f'Document rolled back to version {version_number}.',
            'new_version_number': next_num,
        }, status=status.HTTP_200_OK)


class DocumentAccessLogListView(generics.ListAPIView):
    serializer_class = DocumentAccessLogSerializer
    permission_classes = [IsSuperAdmin]
    filterset_fields = ['document', 'user', 'action']

    def get_queryset(self):
        return DocumentAccessLog.objects.select_related('user__role', 'document').all()


class DocumentAccessLogByDocView(generics.ListAPIView):
    """Get access logs for a specific document — who viewed/downloaded it."""
    serializer_class = DocumentAccessLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        doc_pk = self.kwargs['pk']
        return DocumentAccessLog.objects.filter(
            document_id=doc_pk,
        ).select_related('user__role', 'document').order_by('-created_at')


class HoneypotFileListCreateView(generics.ListCreateAPIView):
    serializer_class = HoneypotFileSerializer
    permission_classes = [IsSuperAdmin]
    queryset = HoneypotFile.objects.select_related('created_by__role', 'last_accessed_by__role').all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class HoneypotFileDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = HoneypotFileSerializer
    permission_classes = [IsSuperAdmin]
    queryset = HoneypotFile.objects.select_related('created_by__role', 'last_accessed_by__role').all()
    lookup_field = 'pk'


class HoneypotAccessView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        honeypot = HoneypotManager.check_access(
            pk, request.user, get_client_ip(request)
        )
        if not honeypot:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
