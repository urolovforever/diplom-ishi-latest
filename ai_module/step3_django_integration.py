"""
Step 3: Django Integration Guide

This script demonstrates how the Isolation Forest model
is integrated into the Django backend.

The actual integration is in:
  - backend/ai_security/engine.py — IsolationForestEngine class
  - backend/ai_security/features.py — Feature extraction
  - backend/ai_security/tasks.py — Celery periodic tasks
  - backend/ai_security/middleware.py — Activity logging middleware
  - backend/ai_security/response.py — Anomaly response handler

Integration Flow:
  1. ActivityLogMiddleware logs every HTTP request
  2. Celery task (every 15 min) extracts features per user
  3. IsolationForestEngine.predict() scores each user
  4. If anomaly detected -> AnomalyReport created
  5. AnomalyResponseHandler takes action (alert/block)
  6. Daily task retrains model on accumulated data
"""


def demonstrate_usage():
    """Example of how the engine is used programmatically."""

    # 1. Train model
    from ai_security.engine import IsolationForestEngine

    engine = IsolationForestEngine(contamination=0.1, n_estimators=100)

    # Training data: list of feature vectors
    # [request_count, unique_endpoints, time_of_day, error_rate, avg_payload_size]
    training_data = [
        [20, 3, 10, 0.02, 1500],
        [15, 2, 14, 0.01, 800],
        [25, 4, 9, 0.03, 2000],
        # ... (need at least 10 samples)
    ]

    engine.train(training_data)
    engine.save()

    # 2. Predict anomaly
    test_vector = [500, 20, 3, 0.8, 50000]  # Suspicious activity
    score = engine.predict(test_vector)
    is_anomaly = engine.is_anomaly(test_vector, threshold=-0.5)

    print(f'Score: {score:.4f}, Is Anomaly: {is_anomaly}')

    # 3. Explain features
    explanation = engine.explain_features(test_vector)
    for name, data in explanation.items():
        print(f'  {name}: contribution={data["contribution"]:.4f}, value={data["value"]}')


if __name__ == '__main__':
    print(__doc__)
    print('\nTo run the integration demo, execute from Django shell:')
    print('  python manage.py shell')
    print('  from ai_module.step3_django_integration import demonstrate_usage')
    print('  demonstrate_usage()')
