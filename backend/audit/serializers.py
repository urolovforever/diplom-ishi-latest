from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'action', 'model_name', 'object_id',
            'changes', 'ip_address', 'created_at',
        ]
        read_only_fields = fields
