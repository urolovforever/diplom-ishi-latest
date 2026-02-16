from datetime import timedelta

from django.http import JsonResponse
from django.utils import timezone

from .models import ActivityLog

SESSION_INACTIVITY_MINUTES = 30


class ActivityLogMiddleware:
    """Middleware to log all API requests for security monitoring."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.path.startswith('/api/') and not request.path.startswith('/api/admin/'):
            user = request.user if request.user.is_authenticated else None

            # Update session last_activity for inactivity tracking
            if user:
                try:
                    from accounts.models import UserSession
                    UserSession.objects.filter(
                        user=user, is_active=True,
                    ).update(last_activity=timezone.now())
                except Exception:
                    pass

            ActivityLog.objects.create(
                user=user,
                action=f'{request.method} {request.path}',
                resource=request.path,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                request_method=request.method,
                request_path=request.path,
                response_status=response.status_code,
            )

        return response


class SessionTimeoutMiddleware:
    """Middleware to enforce session inactivity timeout (30 minutes)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/') and request.user.is_authenticated:
            # Skip login/token endpoints
            skip_paths = ['/api/accounts/login/', '/api/accounts/token/refresh/']
            if request.path not in skip_paths:
                try:
                    from accounts.models import UserSession
                    cutoff = timezone.now() - timedelta(minutes=SESSION_INACTIVITY_MINUTES)
                    active_sessions = UserSession.objects.filter(
                        user=request.user, is_active=True,
                    )

                    # Deactivate expired sessions
                    expired = active_sessions.filter(last_activity__lt=cutoff)
                    if expired.exists():
                        expired.update(is_active=False)

                    # If no active sessions remain, deny access
                    if not active_sessions.filter(is_active=True).exists():
                        return JsonResponse(
                            {'detail': 'Session expired due to inactivity. Please log in again.'},
                            status=401,
                        )
                except Exception:
                    pass

        return self.get_response(request)
