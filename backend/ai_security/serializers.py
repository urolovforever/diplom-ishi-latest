from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import ActivityLog, AnomalyReport, AIModelConfig


class ActivityLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'action', 'resource', 'ip_address', 'user_agent',
            'request_method', 'request_path', 'response_status', 'metadata',
            'created_at',
        ]
        read_only_fields = fields


class AnomalyReportSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = AnomalyReport
        fields = [
            'id', 'title', 'description', 'severity', 'user',
            'is_resolved', 'detected_at', 'resolved_at',
        ]
        read_only_fields = ['id', 'detected_at']


class AnomalyReportWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnomalyReport
        fields = ['id', 'title', 'description', 'severity', 'user', 'is_resolved', 'resolved_at']
        read_only_fields = ['id']


class AIModelConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModelConfig
        fields = ['id', 'name', 'model_type', 'parameters', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
