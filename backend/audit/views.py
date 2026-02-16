from rest_framework import generics
from accounts.permissions import IsSuperAdmin
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsSuperAdmin]
    filterset_fields = ['user', 'action', 'model_name']

    def get_queryset(self):
        return AuditLog.objects.select_related('user__role').all()
