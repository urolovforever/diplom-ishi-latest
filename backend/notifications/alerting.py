import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import AlertRule, Notification, TelegramConfig

logger = logging.getLogger(__name__)

RATE_LIMIT_MINUTES = 15


class AlertEngine:

    def check_thresholds(self):
        """Check all active alert rules."""
        rules = AlertRule.objects.filter(is_active=True)
        for rule in rules:
            value = self._evaluate_condition(rule)
            if value is not None and value >= rule.threshold:
                if self.should_alert(rule):
                    self.dispatch_alert(rule, value)
                    rule.last_triggered_at = timezone.now()
                    rule.save(update_fields=['last_triggered_at'])

    def _evaluate_condition(self, rule):
        """Evaluate a rule's condition and return the current value."""
        since = timezone.now() - timedelta(minutes=RATE_LIMIT_MINUTES)

        if rule.condition_type == 'anomaly_count':
            from ai_security.models import AnomalyReport
            return AnomalyReport.objects.filter(
                detected_at__gte=since, is_resolved=False
            ).count()

        elif rule.condition_type == 'failed_logins':
            from accounts.models import LoginAttempt
            return LoginAttempt.objects.filter(
                created_at__gte=since, success=False
            ).count()

        elif rule.condition_type == 'error_rate':
            from ai_security.models import ActivityLog
            total = ActivityLog.objects.filter(created_at__gte=since).count()
            if total == 0:
                return 0.0
            errors = ActivityLog.objects.filter(
                created_at__gte=since, response_status__gte=400
            ).count()
            return (errors / total) * 100

        elif rule.condition_type == 'honeypot_access':
            from documents.models import HoneypotFile
            return HoneypotFile.objects.filter(
                last_accessed_at__gte=since
            ).count()

        return None

    def should_alert(self, rule):
        """Rate limit: don't alert if triggered within RATE_LIMIT_MINUTES."""
        if not rule.last_triggered_at:
            return True
        return timezone.now() - rule.last_triggered_at > timedelta(minutes=RATE_LIMIT_MINUTES)

    def dispatch_alert(self, rule, value):
        """Dispatch alert through configured channels."""
        message = f'Alert: {rule.name} - Current value: {value} (threshold: {rule.threshold})'
        logger.warning('Alert triggered: %s (value: %s, threshold: %s)', rule.name, value, rule.threshold)

        if rule.action in ('notification', 'all'):
            self._send_in_app(rule, message)

        if rule.action in ('email', 'all'):
            self._send_email(rule, message)

        if rule.action in ('telegram', 'all'):
            self._send_telegram(message)

    def _send_in_app(self, rule, message):
        """Send in-app notifications to admins."""
        from accounts.models import CustomUser, Role
        admins = CustomUser.objects.filter(
            role__name__in=[Role.SUPER_ADMIN, Role.SECURITY_AUDITOR, Role.IT_ADMIN],
            is_active=True,
        )
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                title=f'Alert: {rule.name}',
                message=message,
                notification_type='alert',
            )

    def _send_email(self, rule, message):
        """Send email alert."""
        try:
            from .tasks import send_notification_email
            from accounts.models import CustomUser, Role
            admins = CustomUser.objects.filter(
                role__name__in=[Role.SUPER_ADMIN, Role.SECURITY_AUDITOR],
                is_active=True,
            )
            for admin in admins:
                send_notification_email.delay(admin.email, f'Alert: {rule.name}', message)
        except Exception as e:
            logger.error('Failed to send email alert: %s', e)

    def _send_telegram(self, message):
        """Send Telegram alert to all configured users."""
        try:
            from .tasks import send_telegram_alert
            configs = TelegramConfig.objects.filter(is_active=True)
            for config in configs:
                send_telegram_alert.delay(message, config.chat_id)

            default_chat = settings.TELEGRAM_DEFAULT_CHAT_ID
            if default_chat:
                send_telegram_alert.delay(message, default_chat)
        except Exception as e:
            logger.error('Failed to send Telegram alert: %s', e)
