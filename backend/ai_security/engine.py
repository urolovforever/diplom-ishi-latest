import logging
import os

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from django.conf import settings

from .features import FEATURE_NAMES

logger = logging.getLogger(__name__)

MODEL_DIR = os.path.join(settings.BASE_DIR, 'ml_models')


class IsolationForestEngine:

    def __init__(self, contamination=0.1, n_estimators=200, max_samples=256, random_state=42):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.max_samples = max_samples
        self.random_state = random_state
        self.model = None
        self.scaler = None

    def train(self, feature_matrix):
        """Train Isolation Forest on feature matrix (numpy array or list of lists)."""
        X = np.array(feature_matrix)
        if len(X) < 10:
            logger.warning('Not enough training samples (%d). Skipping.', len(X))
            return False

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        self.model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            max_samples=min(self.max_samples, len(X)),
            random_state=self.random_state,
        )
        self.model.fit(X_scaled)
        logger.info('Isolation Forest trained on %d samples.', len(X))
        return True

    def predict(self, features_vector):
        """Return anomaly score for a single feature vector. Lower = more anomalous."""
        if self.model is None:
            raise ValueError('Model not trained. Call train() or load() first.')
        X = np.array([features_vector])
        if self.scaler is not None:
            X = self.scaler.transform(X)
        score = self.model.decision_function(X)[0]
        return float(score)

    def predict_normalized(self, features_vector):
        """Return normalized anomaly score (0-1, higher = more anomalous)."""
        raw_score = self.predict(features_vector)
        # IF decision_function: negative = anomaly, positive = normal
        # Normalize: map roughly [-1, 1] → [1, 0]
        normalized = max(0.0, min(1.0, 0.5 - raw_score / 2.0))
        return normalized

    def is_anomaly(self, features_vector, threshold=-0.5):
        """Return True if feature vector is an anomaly."""
        score = self.predict(features_vector)
        return score < threshold

    def explain_features(self, features_vector):
        """Return feature importance explanation."""
        if self.model is None:
            raise ValueError('Model not trained.')

        explanations = {}
        base_score = self.predict(features_vector)

        for i, name in enumerate(FEATURE_NAMES):
            modified = list(features_vector)
            modified[i] = 0.0
            modified_score = self.predict(modified)
            explanations[name] = {
                'contribution': round(float(base_score - modified_score), 4),
                'value': features_vector[i],
            }

        return explanations

    def save(self, filepath=None):
        """Save model and scaler to disk."""
        if self.model is None:
            raise ValueError('No model to save.')
        os.makedirs(MODEL_DIR, exist_ok=True)
        filepath = filepath or os.path.join(MODEL_DIR, 'isolation_forest.joblib')
        scaler_path = os.path.join(MODEL_DIR, 'scaler.joblib')
        joblib.dump(self.model, filepath)
        if self.scaler is not None:
            joblib.dump(self.scaler, scaler_path)
        logger.info('Model saved to %s', filepath)
        return filepath

    def load(self, filepath=None):
        """Load model and scaler from disk."""
        filepath = filepath or os.path.join(MODEL_DIR, 'isolation_forest.joblib')
        scaler_path = os.path.join(MODEL_DIR, 'scaler.joblib')
        if not os.path.exists(filepath):
            logger.warning('Model file not found at %s', filepath)
            return False
        self.model = joblib.load(filepath)
        if os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)
        logger.info('Model loaded from %s', filepath)
        return True
