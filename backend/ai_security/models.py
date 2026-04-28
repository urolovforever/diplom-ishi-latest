import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class ActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='activity_logs',
    )
    action = models.CharField(max_length=255)
    resource = models.CharField(max_length=255, blank=True)
    # TZ required fields
    resource_type = models.CharField(max_length=100, blank=True)
    resource_id = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    request_method = models.CharField(max_length=10, blank=True)
    request_path = models.TextField(blank=True)
    response_status = models.IntegerField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at'], name='actlog_user_date_idx'),
            models.Index(fields=['created_at'], name='actlog_date_idx'),
            models.Index(fields=['response_status'], name='actlog_status_idx'),
            models.Index(fields=['request_method'], name='actlog_method_idx'),
        ]

    def __str__(self):
        return f'{self.user} - {self.action} - {self.created_at}'


class AnomalyReport(models.Model):
    SEVERITY_CHOICES = [
        ('low', _('Low')),
        ('medium', _('Medium')),
        ('high', _('High')),
        ('critical', _('Critical')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='low')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='anomaly_reports',
    )
    anomaly_score = models.FloatField(null=True, blank=True)
    features = models.JSONField(default=dict, blank=True)
    is_false_positive = models.BooleanField(default=False)
    is_resolved = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reviewed_anomalies',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    detected_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['-detected_at'], name='anomaly_detected_idx'),
            models.Index(fields=['user', 'detected_at'], name='anomaly_user_date_idx'),
            models.Index(fields=['severity'], name='anomaly_severity_idx'),
            models.Index(fields=['is_resolved'], name='anomaly_resolved_idx'),
        ]

    def __str__(self):
        return f'{self.severity}: {self.title}'


class AIModelConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    model_type = models.CharField(max_length=100)
    parameters = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    model_file_path = models.CharField(max_length=500, blank=True)
    last_trained_at = models.DateTimeField(null=True, blank=True)
    training_samples_count = models.IntegerField(default=0)
    threshold = models.FloatField(default=-0.5)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['model_type', 'is_active'], name='aiconfig_type_active_idx'),
        ]

    def __str__(self):
        return self.name
