from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone

from .models import ActivityLog

# TZ: 8 behavioral features for anomaly detection (is_anomaly is label, not feature)
FEATURE_NAMES = [
    'failed_logins',
    'docs_accessed',
    'session_duration_min',
    'day_of_week',
    'download_mb',
    'own_section',
    'role',
    'entity_type',
]

# Role encoding for ML model
ROLE_ENCODING = {
    'super_admin': 1,
    'konfessiya_rahbari': 2,
    'konfessiya_xodimi': 3,
    'dt_rahbar': 4,
    'dt_xodimi': 5,
}


def extract_user_features(user, hours=1):
    """Extract 9 behavioral features for a user over the last N hours (TZ spec)."""
    since = timezone.now() - timedelta(hours=hours)
    logs = ActivityLog.objects.filter(user=user, created_at__gte=since)

    total = logs.count()

    # 1. Failed login attempts
    from accounts.models import LoginAttempt
    failed_logins = LoginAttempt.objects.filter(
        user=user, success=False, created_at__gte=since,
    ).count()

    # 2. Documents accessed
    docs_accessed = logs.filter(request_path__contains='/documents/').count()

    # 3. Session duration (time between first and last activity)
    if total >= 2:
        first_log = logs.order_by('created_at').first()
        last_log = logs.order_by('-created_at').first()
        duration = (last_log.created_at - first_log.created_at).total_seconds() / 60.0
    else:
        duration = 0.0

    # 4. Day of week (0=Monday, 6=Sunday)
    day_of_week = timezone.now().weekday()

    # 5. Download size in MB
    download_logs = logs.filter(request_path__contains='/download/')
    download_mb = 0.0
    for log in download_logs:
        meta = log.metadata or {}
        size_bytes = meta.get('content_length', 0) or meta.get('file_size', 0)
        if size_bytes:
            download_mb += float(size_bytes) / (1024 * 1024)

    # 6. Own section access (1 = accessing own org data, 0 = accessing other org data)
    own_section = 1.0
    user_org = user.organization or user.effective_confession
    if user_org:
        other_org_access = logs.exclude(
            request_path__contains=str(user_org.id)
        ).filter(
            request_path__contains='/confessions/'
        ).count()
        total_confession_access = logs.filter(request_path__contains='/confessions/').count()
        if total_confession_access > 0:
            own_section = 1.0 - (other_org_access / total_confession_access)

    # 7. Role (encoded as number for ML)
    role_value = 0
    if user.role:
        role_value = ROLE_ENCODING.get(user.role.name, 0)

    # 8. Entity type (confession or organization)
    entity_type_value = 0
    if user.organization:
        entity_type_value = 2  # organization
    elif user.confession:
        entity_type_value = 1  # confession

    return {
        'failed_logins': failed_logins,
        'docs_accessed': docs_accessed,
        'session_duration_min': duration,
        'day_of_week': day_of_week,
        'download_mb': round(download_mb, 2),
        'own_section': own_section,
        'role': role_value,
        'entity_type': entity_type_value,
    }


def features_to_vector(features_dict):
    """Convert features dict to ordered list for ML model."""
    return [features_dict.get(name, 0.0) for name in FEATURE_NAMES]
