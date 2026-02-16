from rest_framework import serializers
from .models import Notification, AlertConfig, TelegramConfig, AlertRule


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type',
            'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class MarkReadSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.UUIDField(), required=False)
    all = serializers.BooleanField(required=False, default=False)


class AlertConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertConfig
        fields = [
            'id', 'name', 'description', 'is_active',
            'threshold', 'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class TelegramConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelegramConfig
        fields = [
            'id', 'user', 'chat_id', 'is_active', 'alert_types',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRule
        fields = [
            'id', 'name', 'condition_type', 'threshold', 'action',
            'is_active', 'last_triggered_at', 'created_by',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'last_triggered_at', 'created_at', 'updated_at']
