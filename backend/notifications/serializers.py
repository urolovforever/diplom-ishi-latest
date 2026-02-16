from rest_framework import serializers
from .models import Notification, AlertConfig


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
