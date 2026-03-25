import logging
import threading
import time
from datetime import timedelta

from django.http import JsonResponse
from django.utils import timezone

from .models import ActivityLog

logger = logging.getLogger(__name__)

SESSION_INACTIVITY_MINUTES = 30
LOG_BUFFER_SIZE = 50
LOG_FLUSH_INTERVAL = 10  # seconds

# Skip logging for these paths (health checks, static, etc.)
SKIP_LOG_PATHS = ('/api/admin/', '/api/health/', '/static/')


class _LogBuffer:
    """Thread-safe buffer for batching activity log writes."""

    def __init__(self):
        self._buffer = []
        self._lock = threading.Lock()
        self._last_flush = time.monotonic()

    def add(self, log_data):
        with self._lock:
            self._buffer.append(log_data)
            should_flush = (
                len(self._buffer) >= LOG_BUFFER_SIZE
                or (time.monotonic() - self._last_flush) >= LOG_FLUSH_INTERVAL
            )
        if should_flush:
            self.flush()

    def flush(self):
        with self._lock:
            if not self._buffer:
                return
            to_write = list(self._buffer)
            self._buffer.clear()
            self._last_flush = time.monotonic()

        try:
            ActivityLog.objects.bulk_create(
                [ActivityLog(**data) for data in to_write],
                ignore_conflicts=True,
            )
        except Exception as e:
            logger.error('Failed to flush activity log buffer (%d items): %s', len(to_write), e)


_log_buffer = _LogBuffer()


class ActivityLogMiddleware:
    """Middleware to log API requests for security monitoring using buffered writes."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.path.startswith('/api/') and not any(
            request.path.startswith(skip) for skip in SKIP_LOG_PATHS
        ):
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

            _log_buffer.add({
                'user': user,
                'action': f'{request.method} {request.path}',
                'resource': request.path,
                'ip_address': request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')[:500],
                'request_method': request.method,
                'request_path': request.path,
                'response_status': response.status_code,
            })

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

                    # Single query: deactivate expired and check remaining in one go
                    UserSession.objects.filter(
                        user=request.user, is_active=True, last_activity__lt=cutoff,
                    ).update(is_active=False)

                    if not UserSession.objects.filter(
                        user=request.user, is_active=True,
                    ).exists():
                        return JsonResponse(
                            {'detail': 'Session expired due to inactivity. Please log in again.'},
                            status=401,
                        )
                except Exception:
                    pass

        return self.get_response(request)
