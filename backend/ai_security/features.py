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
]


def extract_user_features(user, hours=1):
    """Extract behavioral features for a user over the last N hours."""
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
        }

    unique_endpoints = logs.values('request_path').distinct().count()
    error_count = logs.filter(response_status__gte=400).count()
    error_rate = error_count / total if total > 0 else 0.0

    avg_payload = 0.0
    payload_sizes = []
    for log in logs:
        meta = log.metadata or {}
        size = meta.get('content_length', 0)
        if size:
            payload_sizes.append(float(size))
    if payload_sizes:
        avg_payload = sum(payload_sizes) / len(payload_sizes)

    return {
        'request_count_per_hour': total / hours,
        'unique_endpoints': unique_endpoints,
        'time_of_day': timezone.now().hour,
        'error_rate': error_rate,
        'avg_payload_size': avg_payload,
    }


def features_to_vector(features_dict):
    """Convert features dict to ordered list for ML model."""
    return [features_dict.get(name, 0.0) for name in FEATURE_NAMES]
