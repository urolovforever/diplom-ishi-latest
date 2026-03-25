from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import Role
from accounts.permissions import IsLeader, IsSuperAdmin, IsKonfessiyaRahbari, has_role
from audit.mixins import AuditMixin
from .models import Confession, Organization
from .serializers import (
    ConfessionSerializer,
    ConfessionListSerializer,
    OrganizationListSerializer,
    OrganizationWriteSerializer,
)


class ConfessionListCreateView(AuditMixin, generics.ListCreateAPIView):
    serializer_class = ConfessionSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsSuperAdmin()]

    def get_queryset(self):
        return Confession.objects.select_related('leader__role').all()

    def perform_create(self, serializer):
        instance = serializer.save()
        self._create_audit_log('create', instance)


class ConfessionDetailView(AuditMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsSuperAdmin]
    serializer_class = ConfessionSerializer
    lookup_field = 'pk'

    def get_queryset(self):
        return Confession.objects.select_related('leader__role').all()

    def perform_update(self, serializer):
        instance = serializer.save()
        self._create_audit_log('update', instance)


class OrganizationListCreateView(AuditMixin, generics.ListCreateAPIView):

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsLeader()]

    def get_queryset(self):
        return Organization.objects.select_related('leader__role', 'confession').all()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OrganizationWriteSerializer
        return OrganizationListSerializer

    def perform_create(self, serializer):
        user = self.request.user
        role_name = user.role.name if user.role else None

        # Only super_admin and konfessiya_rahbari can create organizations
        if role_name not in [Role.SUPER_ADMIN, Role.KONFESSIYA_RAHBARI]:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Siz tashkilot yarata olmaysiz.")

        # Konfessiya rahbari faqat o'z konfessiyasi uchun tashkilot yarata oladi
        if role_name == Role.KONFESSIYA_RAHBARI and user.confession_id:
            confession_id = serializer.validated_data.get('confession_id') or serializer.validated_data.get('confession')
            if hasattr(confession_id, 'pk'):
                confession_id = confession_id.pk
            if confession_id and str(confession_id) != str(user.confession_id):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Siz faqat o'z konfessiyangiz uchun tashkilot yarata olasiz.")

        instance = serializer.save()
        self._create_audit_log('create', instance)


class OrganizationAllListView(generics.ListAPIView):
    """Barcha tashkilotlar ro'yxati — hujjat ulashish uchun."""
    permission_classes = [IsAuthenticated]
    serializer_class = OrganizationListSerializer
    queryset = Organization.objects.select_related('leader__role', 'confession').filter(is_active=True)


class OrganizationDetailView(AuditMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [has_role(Role.SUPER_ADMIN, Role.KONFESSIYA_RAHBARI)]
    lookup_field = 'pk'

    def get_queryset(self):
        return Organization.objects.select_related('leader__role', 'confession')

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return OrganizationWriteSerializer
        return OrganizationListSerializer

    def perform_update(self, serializer):
        instance = serializer.save()
        self._create_audit_log('update', instance)
