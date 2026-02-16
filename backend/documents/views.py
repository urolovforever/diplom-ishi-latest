from django.db.models import Q
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import Role
from audit.mixins import AuditMixin
from .models import Document, DocumentVersion
from .serializers import DocumentListSerializer, DocumentWriteSerializer, DocumentVersionSerializer


class DocumentListCreateView(AuditMixin, generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ['confession', 'is_encrypted']

    def get_queryset(self):
        user = self.request.user
        qs = Document.objects.select_related('uploaded_by__role').prefetch_related('versions').all()
        if user.role and user.role.name in [Role.SUPER_ADMIN, Role.QOMITA_RAHBAR]:
            return qs
        if user.role and user.role.name == Role.CONFESSION_LEADER:
            return qs.filter(
                Q(uploaded_by=user) | Q(confession__organization__leader=user)
            )
        return qs.filter(uploaded_by=user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DocumentWriteSerializer
        return DocumentListSerializer

    def perform_create(self, serializer):
        instance = serializer.save(uploaded_by=self.request.user)
        # Auto-create initial version
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
        if user.role and user.role.name in [Role.SUPER_ADMIN, Role.QOMITA_RAHBAR]:
            return qs
        if user.role and user.role.name == Role.CONFESSION_LEADER:
            return qs.filter(
                Q(uploaded_by=user) | Q(confession__organization__leader=user)
            )
        return qs.filter(uploaded_by=user)

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return DocumentWriteSerializer
        return DocumentListSerializer


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
