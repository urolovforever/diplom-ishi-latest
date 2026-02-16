from datetime import timedelta

from django.db.models import Count, Avg
from django.utils import timezone

from .models import ActivityLog

FEATURE_NAMES = [
    'request_count_per_hour',
    'unique_endpoints',
    'time_of_day',
    'error_rate',
    'avg_payload_size',
    'docs_accessed',
    'download_count',
    'failed_logins',
    'session_duration_min',
]


def extract_user_features(user, hours=1):
    """Extract 9 behavioral features for a user over the last N hours."""
    since = timezone.now() - timedelta(hours=hours)
    logs = ActivityLog.objects.filter(user=user, created_at__gte=since)

    total = logs.count()
    if total == 0:
        return {
            'request_count_per_hour': 0,
            'unique_endpoints': 0,
            'time_of_day': timezone.now().hour,
            'error_rate': 0.0,
            'avg_payload_size': 0.0,
            'docs_accessed': 0,
            'download_count': 0,
            'failed_logins': 0,
            'session_duration_min': 0.0,
        }

    unique_endpoints = logs.values('request_path').distinct().count()
    error_count = logs.filter(response_status__gte=400).count()
    error_rate = error_count / total if total > 0 else 0.0

    # Average payload size
    avg_payload = 0.0
    payload_sizes = []
    for log in logs:
        meta = log.metadata or {}
        size = meta.get('content_length', 0)
        if size:
            payload_sizes.append(float(size))
    if payload_sizes:
        avg_payload = sum(payload_sizes) / len(payload_sizes)

    # Documents accessed (requests to /documents/ endpoints)
    docs_accessed = logs.filter(request_path__contains='/documents/').count()

    # Download count (requests containing /download/)
    download_count = logs.filter(request_path__contains='/download/').count()

    # Failed login attempts in the time period
    from accounts.models import LoginAttempt
    failed_logins = LoginAttempt.objects.filter(
        user=user, success=False, created_at__gte=since,
    ).count()

    # Session duration (time between first and last activity)
    if total >= 2:
        first_log = logs.order_by('created_at').first()
        last_log = logs.order_by('-created_at').first()
        duration = (last_log.created_at - first_log.created_at).total_seconds() / 60.0
    else:
        duration = 0.0

    return {
        'request_count_per_hour': total / hours,
        'unique_endpoints': unique_endpoints,
        'time_of_day': timezone.now().hour,
        'error_rate': error_rate,
        'avg_payload_size': avg_payload,
        'docs_accessed': docs_accessed,
        'download_count': download_count,
        'failed_logins': failed_logins,
        'session_duration_min': duration,
    }


def features_to_vector(features_dict):
    """Convert features dict to ordered list for ML model."""
    return [features_dict.get(name, 0.0) for name in FEATURE_NAMES]
