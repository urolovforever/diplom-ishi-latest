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
    reviewed_by = UserSerializer(read_only=True)

    class Meta:
        model = AnomalyReport
        fields = [
            'id', 'title', 'description', 'severity', 'user',
            'anomaly_score', 'features', 'is_false_positive',
            'is_resolved', 'reviewed_by', 'reviewed_at',
            'detected_at', 'resolved_at',
        ]
        read_only_fields = ['id', 'detected_at']


class AnomalyReportWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnomalyReport
        fields = [
            'id', 'title', 'description', 'severity', 'user',
            'anomaly_score', 'features', 'is_false_positive',
            'is_resolved', 'resolved_at',
        ]
        read_only_fields = ['id']


class AIModelConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModelConfig
        fields = [
            'id', 'name', 'model_type', 'parameters', 'is_active',
            'model_file_path', 'last_trained_at', 'training_samples_count',
            'threshold', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DashboardStatsSerializer(serializers.Serializer):
    total_anomalies = serializers.IntegerField()
    unreviewed_count = serializers.IntegerField()
    resolved_count = serializers.IntegerField()
    critical_count = serializers.IntegerField()
    recent_anomalies = AnomalyReportSerializer(many=True)
    model_status = serializers.DictField(allow_null=True)
