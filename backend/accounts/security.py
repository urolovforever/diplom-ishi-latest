from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from .models import CustomUser, LoginAttempt, PasswordHistory, UserSession


def get_client_ip(request):
    """Get real client IP from X-Forwarded-For header (behind proxy) or REMOTE_ADDR."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')

MAX_PASSWORD_HISTORY = 5
PASSWORD_EXPIRY_DAYS = 90
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30
MAX_ACTIVE_SESSIONS = 1
SESSION_INACTIVITY_MINUTES = 30
SESSION_MAX_AGE_DAYS = 30  # Sessions auto-expire after 1 month


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
    def check_session_limit(user):
        """Check if user has reached the max active sessions limit.

        First cleans up expired/inactive sessions, then checks the limit.
        Returns (is_over_limit, active_sessions_queryset).
        """
        now = timezone.now()
        inactivity_cutoff = now - timedelta(minutes=SESSION_INACTIVITY_MINUTES)

        # Deactivate expired or inactive sessions
        from django.db.models import Q
        UserSession.objects.filter(
            user=user,
            is_active=True,
        ).filter(
            Q(expires_at__lt=now) | Q(last_activity__lt=inactivity_cutoff)
        ).update(is_active=False)

        active_sessions = UserSession.objects.filter(
            user=user, is_active=True
        ).order_by('-last_activity')
        return active_sessions.count() >= MAX_ACTIVE_SESSIONS, active_sessions

    @staticmethod
    def enforce_session_limit(user):
        """Safety net: deactivate oldest sessions if user exceeds max active sessions."""
        from rest_framework_simplejwt.tokens import RefreshToken

        active_sessions = UserSession.objects.filter(
            user=user, is_active=True
        ).order_by('-created_at')
        if active_sessions.count() > MAX_ACTIVE_SESSIONS:
            to_deactivate = list(active_sessions[MAX_ACTIVE_SESSIONS:])
            for session in to_deactivate:
                session.is_active = False
                session.save(update_fields=['is_active'])
                try:
                    token = RefreshToken(session.refresh_token)
                    token.blacklist()
                except Exception:
                    pass

    @staticmethod
    def check_session_inactivity(user):
        """Deactivate sessions inactive for more than SESSION_INACTIVITY_MINUTES."""
        cutoff = timezone.now() - timedelta(minutes=SESSION_INACTIVITY_MINUTES)
        expired = UserSession.objects.filter(
            user=user, is_active=True, last_activity__lt=cutoff,
        ).update(is_active=False)
        return expired

    @staticmethod
    def cleanup_old_sessions():
        """Delete session records older than SESSION_MAX_AGE_DAYS."""
        cutoff = timezone.now() - timedelta(days=SESSION_MAX_AGE_DAYS)
        count, _ = UserSession.objects.filter(created_at__lt=cutoff).delete()
        return count
