from django.db.models import Q
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import Role
from accounts.permissions import IsITAdmin, IsSecurityAuditor, IsSuperAdmin
from audit.mixins import AuditMixin
from .honeypot import HoneypotManager
from .models import Document, DocumentVersion, DocumentAccessLog, HoneypotFile
from .serializers import (
    DocumentListSerializer, DocumentWriteSerializer,
    DocumentVersionSerializer, DocumentAccessLogSerializer,
    HoneypotFileSerializer,
)

SECURITY_LEVEL_HIERARCHY = {
    'public': 0,
    'internal': 1,
    'confidential': 2,
    'secret': 3,
}

ROLE_MAX_SECURITY_LEVEL = {
    Role.SUPER_ADMIN: 'secret',
    Role.QOMITA_RAHBAR: 'secret',
    Role.SECURITY_AUDITOR: 'secret',
    Role.IT_ADMIN: 'confidential',
    Role.CONFESSION_LEADER: 'confidential',
    Role.PSYCHOLOGIST: 'internal',
    Role.MEMBER: 'internal',
}


def filter_by_security_level(qs, user):
    if not user.role:
        return qs.filter(security_level='public')
    max_level = ROLE_MAX_SECURITY_LEVEL.get(user.role.name, 'public')
    max_num = SECURITY_LEVEL_HIERARCHY.get(max_level, 0)
    allowed = [k for k, v in SECURITY_LEVEL_HIERARCHY.items() if v <= max_num]
    return qs.filter(security_level__in=allowed)


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
