from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import Role
from accounts.permissions import IsLeader, IsQomitaRahbar
from audit.mixins import AuditMixin
from .models import Organization
from .serializers import (
    OrganizationListSerializer,
    OrganizationWriteSerializer,
)


class OrganizationListCreateView(AuditMixin, generics.ListCreateAPIView):
    permission_classes = [IsLeader]

    def get_queryset(self):
        user = self.request.user
        role_name = user.role.name if user.role else None
        qs = Organization.objects.select_related('leader__role').prefetch_related('children__leader__role')

        if role_name == Role.SUPER_ADMIN:
            return qs.all()
        elif role_name == Role.QOMITA_RAHBAR:
            # See their qomita and everything below
            if user.confession:
                from django.db.models import Q
                qomita = user.confession
                return qs.filter(
                    Q(id=qomita.id) |
                    Q(parent=qomita) |
                    Q(parent__parent=qomita)
                )
            return qs.none()
        elif role_name == Role.KONFESSIYA_RAHBARI:
            if user.confession:
                from django.db.models import Q
                return qs.filter(
                    Q(id=user.confession.id) |
                    Q(parent=user.confession)
                )
            return qs.none()
        elif role_name == Role.DT_RAHBAR:
            if user.confession:
                return qs.filter(id=user.confession.id)
            return qs.none()
        return qs.none()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OrganizationWriteSerializer
        return OrganizationListSerializer

    def perform_create(self, serializer):
        user = self.request.user
        role_name = user.role.name if user.role else None
        org_type = serializer.validated_data.get('org_type')

        # Enforce creation rules
        if org_type == 'qomita' and role_name != Role.SUPER_ADMIN:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Faqat Super Admin Qo'mita yarata oladi.")
        if org_type == 'konfessiya' and role_name not in [Role.SUPER_ADMIN, Role.QOMITA_RAHBAR]:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Faqat Qo'mita Rahbari Konfessiya yarata oladi.")
        if org_type == 'diniy_tashkilot' and role_name not in [Role.SUPER_ADMIN, Role.QOMITA_RAHBAR, Role.KONFESSIYA_RAHBARI]:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Faqat Konfessiya Rahbari Diniy Tashkilot yarata oladi.")

        instance = serializer.save()
        self._create_audit_log('create', instance)


class OrganizationAllListView(generics.ListAPIView):
    """Barcha tashkilotlar ro'yxati — hujjat ulashish uchun."""
    permission_classes = [IsAuthenticated]
    serializer_class = OrganizationListSerializer
    queryset = Organization.objects.select_related('leader__role').prefetch_related('children__leader__role').filter(is_active=True)


class OrganizationDetailView(AuditMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsQomitaRahbar]
    lookup_field = 'pk'

    def get_queryset(self):
        return Organization.objects.select_related('leader__role').prefetch_related('children__leader__role')

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return OrganizationWriteSerializer
        return OrganizationListSerializer

    def perform_update(self, serializer):
        instance = serializer.save()
        self._create_audit_log('update', instance)
