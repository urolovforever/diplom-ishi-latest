from datetime import timedelta

from django.db.models import Count, Max
from django.utils import timezone

from .models import ActivityLog

FEATURE_NAMES = [
    'failed_logins',
    'requests_count',
    'docs_accessed',
    'docs_downloaded',
    'hour_of_day',
    'error_rate',
    'unique_endpoints',
    'session_duration_min',
    'sensitive_docs_accessed',
    'distinct_ips',
    'share_actions',
    'admin_actions',
    'password_reset_delay_min',
    'e2e_key_failures',
    'repeated_doc_downloads',
]


def extract_user_features(user, hours=1):
    """Extract 15 behavioral features for a user over the last N hours."""
    since = timezone.now() - timedelta(hours=hours)
    logs = ActivityLog.objects.filter(user=user, created_at__gte=since)

    total = logs.count()

    # 1. Failed login attempts
    from accounts.models import LoginAttempt
    failed_logins = LoginAttempt.objects.filter(
        user=user, success=False, created_at__gte=since,
    ).count()

    # 2. Total requests count
    requests_count = total

    # 3. Documents accessed
    docs_accessed = logs.filter(request_path__contains='/documents/').count()

    # 4. Documents downloaded
    from documents.models import DocumentAccessLog
    docs_downloaded = DocumentAccessLog.objects.filter(
        user=user, action='download', created_at__gte=since,
    ).count()

    # 5. Hour of day (0-23)
    hour_of_day = timezone.now().hour

    # 6. Error rate (4xx/5xx responses ratio)
    if total > 0:
        error_count = logs.filter(response_status__gte=400).count()
        error_rate = round(error_count / total, 4)
    else:
        error_rate = 0.0

    # 7. Unique endpoints accessed
    unique_endpoints = logs.values('request_path').distinct().count()

    # 8. Session duration (time between first and last activity)
    if total >= 2:
        first_log = logs.order_by('created_at').first()
        last_log = logs.order_by('-created_at').first()
        if first_log and last_log:
            duration = (last_log.created_at - first_log.created_at).total_seconds() / 60.0
        else:
            duration = 0.0
    else:
        duration = 0.0

    # 9. Sensitive documents accessed (confidential/secret)
    from documents.models import Document
    sensitive_docs_accessed = DocumentAccessLog.objects.filter(
        user=user,
        created_at__gte=since,
        document__security_level__in=['confidential', 'secret'],
    ).count()

    # 10. Distinct IPs
    distinct_ips = logs.values('ip_address').distinct().count()

    # 11. Share actions (POST to /share/ endpoints)
    share_actions = logs.filter(
        request_path__contains='/share/',
        request_method='POST',
    ).count()

    # 12. Admin actions (/users/ or /ip-restrictions/ with POST/PATCH/DELETE)
    admin_actions = logs.filter(
        request_path__regex=r'/(users|ip-restrictions)/',
        request_method__in=['POST', 'PATCH', 'DELETE'],
    ).count()

    # 13. Password reset delay (minutes between request and confirmation)
    from accounts.models import PasswordResetToken
    last_reset = PasswordResetToken.objects.filter(
        user=user,
        confirmed_at__isnull=False,
        created_at__gte=since,
    ).order_by('-created_at').first()

    if last_reset and last_reset.confirmed_at:
        password_reset_delay_min = round(
            (last_reset.confirmed_at - last_reset.created_at).total_seconds() / 60.0, 2
        )
    else:
        password_reset_delay_min = 0.0

    # 14. E2E key failures (requests to /e2e/ with 4xx+ response)
    e2e_key_failures = logs.filter(
        request_path__contains='/e2e/',
        response_status__gte=400,
    ).count()

    # 15. Repeated document downloads (max downloads of a single document)
    repeated_result = DocumentAccessLog.objects.filter(
        user=user,
        action='download',
        created_at__gte=since,
    ).values('document').annotate(
        cnt=Count('id'),
    ).aggregate(max_cnt=Max('cnt'))
    repeated_doc_downloads = repeated_result['max_cnt'] or 0

    return {
        'failed_logins': failed_logins,
        'requests_count': requests_count,
        'docs_accessed': docs_accessed,
        'docs_downloaded': docs_downloaded,
        'hour_of_day': hour_of_day,
        'error_rate': error_rate,
        'unique_endpoints': unique_endpoints,
        'session_duration_min': round(duration, 2),
        'sensitive_docs_accessed': sensitive_docs_accessed,
        'distinct_ips': distinct_ips,
        'share_actions': share_actions,
        'admin_actions': admin_actions,
        'password_reset_delay_min': password_reset_delay_min,
        'e2e_key_failures': e2e_key_failures,
        'repeated_doc_downloads': repeated_doc_downloads,
    }


def features_to_vector(features_dict):
    """Convert features dict to ordered list for ML model."""
    return [features_dict.get(name, 0.0) for name in FEATURE_NAMES]
