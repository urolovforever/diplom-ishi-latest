import logging
import os
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

BATCH_DELETE_SIZE = 5000


@shared_task(bind=True, max_retries=3, soft_time_limit=300, time_limit=600)
def train_isolation_forest(self):
    """Train Isolation Forest model on recent activity data. Runs daily at 2 AM."""
    try:
        from accounts.models import CustomUser
        from .engine import IsolationForestEngine
        from .features import extract_user_features, features_to_vector
        from .models import AIModelConfig

        users = CustomUser.objects.filter(is_active=True)
        feature_matrix = []

        for user in users:
            features = extract_user_features(user, hours=24)
            vector = features_to_vector(features)
            if not all(v == 0 for v in vector):
                feature_matrix.append(vector)

        if len(feature_matrix) < 10:
            logger.info('Not enough data to train (%d users). Skipping.', len(feature_matrix))
            return {'status': 'skipped', 'reason': 'insufficient_data', 'samples': len(feature_matrix)}

        from django.conf import settings as django_settings
        ai_settings = getattr(django_settings, 'AI_SECURITY', {})
        contamination = ai_settings.get('CONTAMINATION', 0.05)

        engine = IsolationForestEngine(contamination=contamination)
        if engine.train(feature_matrix):
            # Save versioned model
            now = timezone.now()
            version_tag = now.strftime('%Y%m%d_%H%M%S')
            filepath = engine.save(version_tag=version_tag)

            # Evaluate model metrics
            metrics = engine.evaluate(feature_matrix)

            config, _ = AIModelConfig.objects.update_or_create(
                model_type='isolation_forest',
                is_active=True,
                defaults={
                    'name': 'Isolation Forest - Anomaly Detection',
                    'model_file_path': filepath,
                    'last_trained_at': now,
                    'training_samples_count': len(feature_matrix),
                    'parameters': {
                        'version': version_tag,
                        'contamination': engine.contamination,
                        'n_estimators': engine.n_estimators,
                        'metrics': metrics,
                    },
                },
            )
            logger.info(
                'Isolation Forest trained and saved. Samples: %d, Version: %s, Metrics: %s',
                len(feature_matrix), version_tag, metrics,
            )

            # Check model degradation
            _check_model_quality(metrics, config)

            return {'status': 'success', 'samples': len(feature_matrix), 'version': version_tag, 'metrics': metrics}

        return {'status': 'failed', 'reason': 'training_returned_false'}

    except Exception as exc:
        logger.exception('train_isolation_forest failed: %s', exc)
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=2, soft_time_limit=120, time_limit=180)
def scan_recent_activity(self):
    """Scan recent activity for anomalies. Runs every 15 minutes."""
    try:
        from accounts.models import CustomUser
        from .engine import IsolationForestEngine
        from .features import extract_user_features, features_to_vector
        from .models import AIModelConfig, AnomalyReport

        config = AIModelConfig.objects.filter(
            model_type='isolation_forest', is_active=True
        ).first()

        if not config or not config.model_file_path:
            logger.info('No trained model available. Skipping scan.')
            return {'status': 'skipped', 'reason': 'no_model'}

        engine = IsolationForestEngine()
        if not engine.load(config.model_file_path):
            logger.warning('Failed to load model from %s', config.model_file_path)
            return {'status': 'failed', 'reason': 'model_load_error'}

        users = CustomUser.objects.filter(is_active=True)
        anomalies_found = 0

        for user in users:
            try:
                features = extract_user_features(user, hours=1)
                vector = features_to_vector(features)

                if all(v == 0 for v in vector):
                    continue

                normalized_score = engine.predict_normalized(vector)

                if normalized_score >= 0.4:
                    anomalies_found += 1

                    if normalized_score >= 0.7:
                        severity = 'critical'
                    elif normalized_score >= 0.55:
                        severity = 'high'
                    else:
                        severity = 'medium'

                    # Skip if already reported within 1 hour
                    recent_report = AnomalyReport.objects.filter(
                        user=user,
                        detected_at__gte=timezone.now() - timedelta(hours=1),
                    ).exists()

                    if not recent_report:
                        try:
                            explanation = engine.explain_features(vector)
                        except Exception as explain_err:
                            logger.warning('explain_features failed for %s: %s', user.email, explain_err)
                            explanation = {}

                        AnomalyReport.objects.create(
                            title=f'Anomalous behavior detected: {user.email}',
                            description=f'Anomaly score: {normalized_score:.4f}. Features: {features}',
                            severity=severity,
                            user=user,
                            anomaly_score=normalized_score,
                            features={**features, '_explanation': explanation},
                        )
                        logger.warning(
                            'Anomaly detected for %s (score: %.4f, severity: %s)',
                            user.email, normalized_score, severity,
                        )

                        try:
                            from .response import AnomalyResponseHandler
                            AnomalyResponseHandler.handle_anomaly(normalized_score, user, features)
                        except Exception as resp_err:
                            logger.error('Failed to handle anomaly response for %s: %s', user.email, resp_err)

            except Exception as user_err:
                logger.error('Error scanning user %s: %s', user.email, user_err)
                continue

        logger.info('Scan complete. Anomalies found: %d', anomalies_found)
        return {'status': 'success', 'anomalies_found': anomalies_found}

    except Exception as exc:
        logger.exception('scan_recent_activity failed: %s', exc)
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=2, soft_time_limit=600, time_limit=900)
def cleanup_old_logs(self):
    """Clean up old activity logs in batches. Runs weekly, 2-year retention (TZ requirement)."""
    try:
        from django.conf import settings
        from .models import ActivityLog

        retention_days = getattr(settings, 'AI_SECURITY', {}).get('LOG_RETENTION_DAYS', 730)
        cutoff = timezone.now() - timedelta(days=retention_days)
        total_deleted = 0

        while True:
            batch_ids = list(
                ActivityLog.objects.filter(created_at__lt=cutoff)
                .values_list('id', flat=True)[:BATCH_DELETE_SIZE]
            )
            if not batch_ids:
                break
            count, _ = ActivityLog.objects.filter(id__in=batch_ids).delete()
            total_deleted += count
            logger.info('Deleted batch of %d old activity logs (%d total so far).', count, total_deleted)

        logger.info('Cleanup complete. Total deleted: %d (retention: %d days).', total_deleted, retention_days)
        return {'status': 'success', 'deleted': total_deleted}

    except Exception as exc:
        logger.exception('cleanup_old_logs failed: %s', exc)
        raise self.retry(exc=exc, countdown=120)


def _check_model_quality(metrics, config):
    """Check model quality and send alert if metrics degrade below thresholds."""
    MIN_PRECISION = 0.3
    MIN_F1 = 0.25

    precision = metrics.get('precision', 0)
    f1 = metrics.get('f1', 0)

    if precision < MIN_PRECISION or f1 < MIN_F1:
        logger.warning(
            'Model quality degraded! Precision: %.4f (min: %.2f), F1: %.4f (min: %.2f)',
            precision, MIN_PRECISION, f1, MIN_F1,
        )
        try:
            from notifications.models import Notification
            from accounts.models import CustomUser

            admins = CustomUser.objects.filter(role__name='super_admin', is_active=True)
            for admin in admins:
                Notification.objects.create(
                    user=admin,
                    title='AI model sifati pasaydi',
                    message=(
                        f'Isolation Forest model sifati pasaydi. '
                        f'Precision: {precision:.4f}, F1: {f1:.4f}. '
                        f'Modelni qayta o\'qitish yoki parametrlarni sozlash tavsiya etiladi.'
                    ),
                    notification_type='alert',
                )
        except Exception as notify_err:
            logger.error('Failed to send model quality alert: %s', notify_err)
