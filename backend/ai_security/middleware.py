from django.utils import timezone

from .models import ActivityLog


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
