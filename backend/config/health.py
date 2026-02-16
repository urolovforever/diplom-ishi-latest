from django.db import connection
from django.http import JsonResponse
from django.conf import settings

import redis


def health_check(request):
    """Check DB and Redis connectivity."""
    services = {}

    # Check database
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        services['database'] = 'ok'
    except Exception as e:
        services['database'] = f'error: {e}'

    # Check Redis
    try:
        r = redis.from_url(settings.CELERY_BROKER_URL)
        r.ping()
        services['redis'] = 'ok'
    except Exception as e:
        services['redis'] = f'error: {e}'

    all_ok = all(v == 'ok' for v in services.values())
    return JsonResponse(
        {'status': 'ok' if all_ok else 'degraded', 'services': services},
        status=200 if all_ok else 503,
    )
