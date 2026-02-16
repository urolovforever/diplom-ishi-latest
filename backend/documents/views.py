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
from accounts.permissions import IsITAdmin, IsSecurityAuditor, IsSuperAdmin
from audit.mixins import AuditMixin
from .encryption import encrypt_file, decrypt_file
from .honeypot import HoneypotManager
from .models import Document, DocumentVersion, DocumentAccessLog, HoneypotFile
from .permissions import (
    SECURITY_LEVEL_HIERARCHY, ROLE_MAX_SECURITY_LEVEL,
    filter_by_security_level, requires_download_confirmation,
)
from .serializers import (
    DocumentListSerializer, DocumentWriteSerializer,
    DocumentVersionSerializer, DocumentAccessLogSerializer,
    HoneypotFileSerializer,
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
            role__name__in=[Role.SUPER_ADMIN, Role.QOMITA_RAHBAR],
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
    filterset_fields = ['confession', 'is_encrypted', 'security_level', 'category']

    def get_queryset(self):
        user = self.request.user
        qs = Document.objects.select_related('uploaded_by__role').prefetch_related('versions').all()
        if user.role and user.role.name in [Role.SUPER_ADMIN, Role.QOMITA_RAHBAR, Role.SECURITY_AUDITOR]:
            return filter_by_security_level(qs, user)
        if user.role and user.role.name == Role.CONFESSION_LEADER:
            qs = qs.filter(
                Q(uploaded_by=user) | Q(confession__organization__leader=user)
            )
            return filter_by_security_level(qs, user)
        return filter_by_security_level(qs.filter(uploaded_by=user), user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DocumentWriteSerializer
        return DocumentListSerializer

    def perform_create(self, serializer):
        instance = serializer.save(uploaded_by=self.request.user)
        # Encrypt file if encryption is enabled
        if instance.is_encrypted and instance.file:
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
        self._create_audit_log('create', instance)
        return instance


class DocumentDetailView(AuditMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = 'pk'

    def get_queryset(self):
        user = self.request.user
        qs = Document.objects.select_related('uploaded_by__role').prefetch_related('versions').all()
        if user.role and user.role.name in [Role.SUPER_ADMIN, Role.QOMITA_RAHBAR, Role.SECURITY_AUDITOR]:
            return filter_by_security_level(qs, user)
        if user.role and user.role.name == Role.CONFESSION_LEADER:
            qs = qs.filter(
                Q(uploaded_by=user) | Q(confession__organization__leader=user)
            )
            return filter_by_security_level(qs, user)
        return filter_by_security_level(qs.filter(uploaded_by=user), user)

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
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return response


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
            ip_address=request.META.get('REMOTE_ADDR'),
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


class DocumentAccessLogListView(generics.ListAPIView):
    serializer_class = DocumentAccessLogSerializer
    permission_classes = [IsSuperAdmin | IsSecurityAuditor]

    def get_queryset(self):
        return DocumentAccessLog.objects.select_related('user__role', 'document').all()


class HoneypotFileListCreateView(generics.ListCreateAPIView):
    serializer_class = HoneypotFileSerializer
    permission_classes = [IsSuperAdmin | IsITAdmin]
    queryset = HoneypotFile.objects.select_related('created_by__role', 'last_accessed_by__role').all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class HoneypotFileDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = HoneypotFileSerializer
    permission_classes = [IsSuperAdmin | IsITAdmin]
    queryset = HoneypotFile.objects.select_related('created_by__role', 'last_accessed_by__role').all()
    lookup_field = 'pk'


class HoneypotAccessView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        honeypot = HoneypotManager.check_access(
            pk, request.user, request.META.get('REMOTE_ADDR')
        )
        if not honeypot:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
