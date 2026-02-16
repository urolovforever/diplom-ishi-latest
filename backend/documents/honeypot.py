import logging

from django.utils import timezone

from .models import HoneypotFile

logger = logging.getLogger(__name__)


class HoneypotManager:

    @staticmethod
    def create(title, description, file_path, created_by):
        return HoneypotFile.objects.create(
            title=title,
            description=description,
            file_path=file_path,
            created_by=created_by,
        )

    @staticmethod
    def check_access(honeypot_id, user, ip_address=None):
        try:
            honeypot = HoneypotFile.objects.get(id=honeypot_id, is_active=True)
        except HoneypotFile.DoesNotExist:
            return None

        honeypot.access_count += 1
        honeypot.last_accessed_at = timezone.now()
        honeypot.last_accessed_by = user
        honeypot.save(update_fields=['access_count', 'last_accessed_at', 'last_accessed_by'])

        HoneypotManager.trigger_alert(honeypot, user, ip_address)
        return honeypot

    @staticmethod
    def trigger_alert(honeypot, user, ip_address=None):
        logger.warning(
            f'HONEYPOT ACCESS: {honeypot.title} accessed by {user.email} from {ip_address}'
        )
        # Create notification for admins
        from notifications.models import Notification
        from accounts.models import CustomUser, Role

        admins = CustomUser.objects.filter(
            role__name__in=[Role.SUPER_ADMIN, Role.SECURITY_AUDITOR, Role.IT_ADMIN],
            is_active=True,
        )
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                title='Honeypot File Accessed',
                message=f'Honeypot file "{honeypot.title}" was accessed by {user.email} from IP {ip_address}.',
                notification_type='alert',
            )

        # Create anomaly report
        from ai_security.models import AnomalyReport
        AnomalyReport.objects.create(
            title=f'Honeypot Access: {honeypot.title}',
            description=f'User {user.email} accessed honeypot file "{honeypot.title}" from IP {ip_address}.',
            severity='high',
            user=user,
        )

        # Try sending telegram alert
        try:
            from notifications.tasks import send_telegram_alert
            send_telegram_alert.delay(
                f'HONEYPOT ALERT: {honeypot.title} accessed by {user.email} from {ip_address}'
            )
        except Exception:
            pass
