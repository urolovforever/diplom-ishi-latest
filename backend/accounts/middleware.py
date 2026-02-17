import logging
from datetime import timedelta

from django.http import JsonResponse
from django.utils import timezone

from .models import CustomUser
from .security import PASSWORD_EXPIRY_DAYS

logger = logging.getLogger(__name__)

# Paths that should always be accessible
EXEMPT_PATHS = [
    '/api/accounts/login/',
    '/api/accounts/logout/',
    '/api/accounts/verify-2fa/',
    '/api/accounts/token/refresh/',
    '/api/accounts/password-reset/',
    '/api/accounts/password-reset/confirm/',
    '/api/accounts/change-password/',
    '/api/health/',
]


class PasswordExpiryMiddleware:
    """Force password change if password has expired (90 days)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if (
            request.path.startswith('/api/')
            and request.user.is_authenticated
            and request.path not in EXEMPT_PATHS
        ):
            user = request.user
            if user.must_change_password:
                return JsonResponse(
                    {
                        'detail': 'Parolingiz muddati tugagan. Iltimos, parolni o\'zgartiring.',
                        'must_change_password': True,
                    },
                    status=403,
                )
            if user.password_changed_at:
                expiry = user.password_changed_at + timedelta(days=PASSWORD_EXPIRY_DAYS)
                if timezone.now() > expiry:
                    user.must_change_password = True
                    user.save(update_fields=['must_change_password'])
                    return JsonResponse(
                        {
                            'detail': 'Parolingiz muddati tugagan. Iltimos, parolni o\'zgartiring.',
                            'must_change_password': True,
                        },
                        status=403,
                    )

        return self.get_response(request)


class IPRestrictionMiddleware:
    """Block or allow requests based on IP whitelist/blacklist."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/'):
            ip = request.META.get('REMOTE_ADDR')
            if ip and self._is_blocked(ip):
                logger.warning('Blocked request from IP: %s', ip)
                return JsonResponse(
                    {'detail': 'IP manzil bloklangan.'},
                    status=403,
                )

        return self.get_response(request)

    @staticmethod
    def _is_blocked(ip):
        from .models import IPRestriction
        try:
            # Check blacklist first
            if IPRestriction.objects.filter(ip_address=ip, list_type='blacklist', is_active=True).exists():
                return True
            # If whitelist exists, check if IP is in it
            whitelist_exists = IPRestriction.objects.filter(list_type='whitelist', is_active=True).exists()
            if whitelist_exists:
                return not IPRestriction.objects.filter(
                    ip_address=ip, list_type='whitelist', is_active=True,
                ).exists()
        except Exception:
            pass
        return False
