import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


class AnomalyResponseHandler:
    """Handle anomaly responses based on severity score."""

    # Thresholds from TZ: 0-0.4 normal, 0.4-0.7 warning, 0.7+ critical
    WARNING_THRESHOLD = 0.4
    CRITICAL_THRESHOLD = 0.7

    @classmethod
    def handle_anomaly(cls, score, user, features=None):
        """Take action based on anomaly score (0.0 to 1.0 scale, higher = more anomalous)."""
        if score >= cls.CRITICAL_THRESHOLD:
            cls._handle_critical(user, score, features)
        elif score >= cls.WARNING_THRESHOLD:
            cls._handle_warning(user, score, features)
        else:
            logger.debug('Normal behavior for %s (score: %.4f)', user.email, score)

    @classmethod
    def _handle_critical(cls, user, score, features):
        """Critical anomaly: block sessions + alert admins + log."""
        logger.critical('CRITICAL anomaly for %s (score: %.4f)', user.email, score)
        cls.block_user_sessions(user)
        cls.send_alert(user, score, features, severity='critical')

    @classmethod
    def _handle_warning(cls, user, score, features):
        """Warning level: alert admins but don't block."""
        logger.warning('WARNING anomaly for %s (score: %.4f)', user.email, score)
        cls.send_alert(user, score, features, severity='high')

    @staticmethod
    def block_user_sessions(user):
        """Deactivate all user sessions (force re-login)."""
        from accounts.models import UserSession

        count = UserSession.objects.filter(user=user, is_active=True).update(
            is_active=False,
        )
        logger.info('Blocked %d active sessions for %s', count, user.email)
        return count

    @staticmethod
    def send_alert(user, score, features, severity='high'):
        """Send alerts to all admin users via notifications + telegram."""
        from accounts.models import CustomUser, Role
        from notifications.models import Notification

        admins = CustomUser.objects.filter(
            role__name__in=[Role.SUPER_ADMIN],
            is_active=True,
        )

        feature_summary = ''
        if features:
            sorted_features = sorted(features.items(), key=lambda x: abs(x[1]) if isinstance(x[1], (int, float)) else 0, reverse=True)
            feature_summary = ', '.join(f'{k}: {v}' for k, v in sorted_features[:3])

        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                title=f'AI Alert: {severity.upper()} anomaly detected',
                message=(
                    f'User {user.email} anomaly score: {score:.4f}. '
                    f'Top features: {feature_summary}'
                ),
                notification_type='alert',
            )

        # TZ: Email alert to admins
        try:
            from notifications.tasks import send_notification_email
            for admin in admins:
                send_notification_email.delay(
                    admin.email,
                    f'AI Anomaly Alert: {severity.upper()}',
                    f'Foydalanuvchi: {user.email}\n'
                    f'Anomaliya balli: {score:.4f}\n'
                    f'Darajasi: {severity.upper()}\n'
                    f'Asosiy ko\'rsatkichlar: {feature_summary}\n\n'
                    f'Iltimos, tizimga kirib tekshiring.',
                )
        except Exception as e:
            logger.error('Failed to send email alert: %s', e)

