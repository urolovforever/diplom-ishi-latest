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
            role__name__in=[Role.SUPER_ADMIN, Role.QOMITA_RAHBAR],
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
                notification_type='anomaly',
            )

        # Telegram alert
        try:
            from django.conf import settings
            if settings.TELEGRAM_BOT_TOKEN:
                from notifications.telegram import TelegramBot
                bot = TelegramBot()
                chat_id = settings.TELEGRAM_DEFAULT_CHAT_ID
                if chat_id:
                    bot.send_alert(
                        chat_id,
                        f'AI Anomaly: {severity.upper()}',
                        f'User: {user.email}\nScore: {score:.4f}\nFeatures: {feature_summary}',
                        severity,
                    )
        except Exception as e:
            logger.error('Failed to send Telegram alert: %s', e)
