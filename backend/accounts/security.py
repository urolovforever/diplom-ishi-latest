from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from .models import CustomUser, LoginAttempt, PasswordHistory, UserSession

MAX_PASSWORD_HISTORY = 5
PASSWORD_EXPIRY_DAYS = 90
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30
MAX_ACTIVE_SESSIONS = 2
SESSION_INACTIVITY_MINUTES = 30


class SecurityManager:

    @staticmethod
    def check_password_history(user, raw_password):
        """Return True if password was used in last N passwords."""
        recent = PasswordHistory.objects.filter(user=user)[:MAX_PASSWORD_HISTORY]
        for entry in recent:
            if check_password(raw_password, entry.password_hash):
                return True
        return False

    @staticmethod
    def save_password_history(user):
        """Save current password hash to history."""
        PasswordHistory.objects.create(
            user=user,
            password_hash=user.password,
        )

    @staticmethod
    def check_password_expiry(user):
        """Return True if password has expired."""
        if not user.password_changed_at:
            return False
        expiry_date = user.password_changed_at + timedelta(days=PASSWORD_EXPIRY_DAYS)
        return timezone.now() > expiry_date

    @staticmethod
    def record_login_attempt(email, ip_address='', user_agent='', success=False, user=None):
        """Record a login attempt and update user lockout state."""
        LoginAttempt.objects.create(
            user=user,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
        )
        if user:
            if success:
                user.failed_login_count = 0
                user.locked_until = None
                user.save(update_fields=['failed_login_count', 'locked_until'])
            else:
                user.failed_login_count += 1
                if user.failed_login_count >= MAX_FAILED_ATTEMPTS:
                    user.locked_until = timezone.now() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
                user.save(update_fields=['failed_login_count', 'locked_until'])

    @staticmethod
    def check_account_lockout(user):
        """Return True if account is locked."""
        if user.locked_until and timezone.now() < user.locked_until:
            return True
        if user.locked_until and timezone.now() >= user.locked_until:
            user.failed_login_count = 0
            user.locked_until = None
            user.save(update_fields=['failed_login_count', 'locked_until'])
        return False

    @staticmethod
    def enforce_session_limit(user):
        """Deactivate oldest sessions if user exceeds max active sessions."""
        active_sessions = UserSession.objects.filter(
            user=user, is_active=True
        ).order_by('-created_at')
        if active_sessions.count() > MAX_ACTIVE_SESSIONS:
            to_deactivate = active_sessions[MAX_ACTIVE_SESSIONS:]
            UserSession.objects.filter(
                id__in=[s.id for s in to_deactivate]
            ).update(is_active=False)

    @staticmethod
    def check_session_inactivity(user):
        """Deactivate sessions inactive for more than SESSION_INACTIVITY_MINUTES."""
        cutoff = timezone.now() - timedelta(minutes=SESSION_INACTIVITY_MINUTES)
        expired = UserSession.objects.filter(
            user=user, is_active=True, last_activity__lt=cutoff,
        ).update(is_active=False)
        return expired
