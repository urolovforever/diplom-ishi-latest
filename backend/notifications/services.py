"""
Unified notification service layer.
Provides a single interface for sending notifications via all channels.
"""
import logging

from django.conf import settings

from .models import Notification

logger = logging.getLogger(__name__)


class NotificationService:
    """Unified service for sending notifications through all channels."""

    @staticmethod
    def send_in_app(recipient, title, message, notification_type='info'):
        """Create an in-app notification."""
        return Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
        )

    @staticmethod
    def send_email(recipient_email, subject, message):
        """Send email notification via Celery task."""
        from .tasks import send_notification_email
        send_notification_email.delay(recipient_email, subject, message)

    @staticmethod
    def send_telegram(message, chat_id=None):
        """Send Telegram notification via Celery task."""
        from .tasks import send_telegram_alert
        send_telegram_alert.delay(message, chat_id=chat_id)

    @classmethod
    def notify_admins(cls, title, message, notification_type='alert'):
        """Send notification to all admin users (Super Admin + Qomita Rahbar)."""
        from accounts.models import CustomUser, Role
        admins = CustomUser.objects.filter(
            role__name__in=[Role.SUPER_ADMIN, Role.QOMITA_RAHBAR],
            is_active=True,
        )
        notifications = []
        for admin in admins:
            notifications.append(cls.send_in_app(admin, title, message, notification_type))
        return notifications

    @classmethod
    def notify_security_team(cls, title, message, notification_type='alert'):
        """Send notification to security team (Admin + Security Auditor + IT Admin)."""
        from accounts.models import CustomUser, Role
        team = CustomUser.objects.filter(
            role__name__in=[Role.SUPER_ADMIN, Role.SECURITY_AUDITOR, Role.IT_ADMIN],
            is_active=True,
        )
        notifications = []
        for member in team:
            notifications.append(cls.send_in_app(member, title, message, notification_type))

        # Also send Telegram alert
        cls.send_telegram(f"<b>{title}</b>\n\n{message}")

        return notifications

    @classmethod
    def send_anomaly_alert(cls, user, score, severity, features):
        """Send anomaly detection alert through all channels."""
        title = f'Anomaly Detected: {user.email}'
        message = (
            f'Anomaly score: {score:.4f}\n'
            f'Severity: {severity}\n'
            f'Request count: {features.get("request_count_per_hour", 0)}\n'
            f'Failed logins: {features.get("failed_logins", 0)}'
        )
        cls.notify_security_team(title, message, notification_type='alert')

    @classmethod
    def send_honeypot_alert(cls, honeypot, user, ip_address):
        """Send honeypot access alert through all channels."""
        title = f'Honeypot Accessed: {honeypot.title}'
        message = (
            f'User: {user.email}\n'
            f'IP: {ip_address}\n'
            f'File: {honeypot.file_path}\n'
            f'Access count: {honeypot.access_count}'
        )
        cls.notify_security_team(title, message, notification_type='alert')
