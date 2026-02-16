from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import AuditLog, Report


class AuditLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'action', 'model_name', 'object_id',
            'changes', 'ip_address', 'created_at',
        ]
        read_only_fields = fields


class ReportSerializer(serializers.ModelSerializer):
    generated_by = UserSerializer(read_only=True)

    class Meta:
        model = Report
        fields = [
            'id', 'title', 'report_type', 'data', 'generated_by',
            'date_from', 'date_to', 'created_at',
        ]
        read_only_fields = ['id', 'data', 'generated_by', 'created_at']


class ReportGenerateSerializer(serializers.Serializer):
    report_type = serializers.ChoiceField(choices=['activity', 'security', 'confession'])
    date_from = serializers.DateTimeField(required=False, allow_null=True)
    date_to = serializers.DateTimeField(required=False, allow_null=True)
