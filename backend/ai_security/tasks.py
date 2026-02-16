import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def train_isolation_forest():
    """Train Isolation Forest model on recent activity data. Runs daily at 2 AM."""
    from accounts.models import CustomUser
    from .engine import IsolationForestEngine
    from .features import extract_user_features, features_to_vector
    from .models import AIModelConfig

    users = CustomUser.objects.filter(is_active=True)
    feature_matrix = []

    for user in users:
        features = extract_user_features(user, hours=24)
        feature_matrix.append(features_to_vector(features))

    if len(feature_matrix) < 10:
        logger.info('Not enough data to train (%d users). Skipping.', len(feature_matrix))
        return

    engine = IsolationForestEngine()
    if engine.train(feature_matrix):
        filepath = engine.save()

        config, _ = AIModelConfig.objects.update_or_create(
            model_type='isolation_forest',
            is_active=True,
            defaults={
                'name': 'Isolation Forest - Anomaly Detection',
                'model_file_path': filepath,
                'last_trained_at': timezone.now(),
                'training_samples_count': len(feature_matrix),
            },
        )
        logger.info('Isolation Forest trained and saved. Samples: %d', len(feature_matrix))


@shared_task
def scan_recent_activity():
    """Scan recent activity for anomalies. Runs every 15 minutes."""
    from accounts.models import CustomUser
    from .engine import IsolationForestEngine
    from .features import extract_user_features, features_to_vector
    from .models import AIModelConfig, AnomalyReport

    config = AIModelConfig.objects.filter(
        model_type='isolation_forest', is_active=True
    ).first()

    if not config or not config.model_file_path:
        logger.info('No trained model available. Skipping scan.')
        return

    engine = IsolationForestEngine()
    if not engine.load(config.model_file_path):
        logger.warning('Failed to load model from %s', config.model_file_path)
        return

    threshold = config.threshold
    users = CustomUser.objects.filter(is_active=True)
    anomalies_found = 0

    for user in users:
        features = extract_user_features(user, hours=1)
        vector = features_to_vector(features)

        if features['request_count_per_hour'] == 0:
            continue

        score = engine.predict(vector)

        if score < threshold:
            anomalies_found += 1
            severity = 'critical' if score < threshold * 2 else 'high' if score < threshold * 1.5 else 'medium'

            recent_report = AnomalyReport.objects.filter(
                user=user,
                detected_at__gte=timezone.now() - timedelta(hours=1),
            ).exists()

            if not recent_report:
                AnomalyReport.objects.create(
                    title=f'Anomalous behavior detected: {user.email}',
                    description=f'Anomaly score: {score:.4f} (threshold: {threshold}). '
                                f'Features: {features}',
                    severity=severity,
                    user=user,
                    anomaly_score=score,
                    features=features,
                )
                logger.warning('Anomaly detected for %s (score: %.4f)', user.email, score)

                # Trigger anomaly response (session blocking for critical, alerts for all)
                try:
                    from .response import AnomalyResponseHandler
                    # Convert IF score to 0-1 scale (lower IF score = higher anomaly)
                    normalized_score = max(0.0, min(1.0, -score))
                    AnomalyResponseHandler.handle_anomaly(normalized_score, user, features)
                except Exception as e:
                    logger.error('Failed to handle anomaly response: %s', e)

    logger.info('Scan complete. Anomalies found: %d', anomalies_found)


@shared_task
def cleanup_old_logs():
    """Clean up old activity logs. Runs weekly, 90-day retention."""
    from .models import ActivityLog

    cutoff = timezone.now() - timedelta(days=90)
    count, _ = ActivityLog.objects.filter(created_at__lt=cutoff).delete()
    logger.info('Cleaned up %d old activity logs.', count)
