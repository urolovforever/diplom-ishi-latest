import logging
import os

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from django.conf import settings

from .features import FEATURE_NAMES

logger = logging.getLogger(__name__)

MODEL_DIR = os.path.join(settings.BASE_DIR, 'ml_models')


class IsolationForestEngine:

    def __init__(self, contamination=0.1, n_estimators=100, random_state=42):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.model = None

    def train(self, feature_matrix):
        """Train Isolation Forest on feature matrix (numpy array or list of lists)."""
        X = np.array(feature_matrix)
        if len(X) < 10:
            logger.warning('Not enough training samples (%d). Skipping.', len(X))
            return False

        self.model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            random_state=self.random_state,
        )
        self.model.fit(X)
        logger.info('Isolation Forest trained on %d samples.', len(X))
        return True

    def predict(self, features_vector):
        """Return anomaly score for a single feature vector. Lower = more anomalous."""
        if self.model is None:
            raise ValueError('Model not trained. Call train() or load() first.')
        X = np.array([features_vector])
        score = self.model.decision_function(X)[0]
        return float(score)

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
                'contribution': float(base_score - modified_score),
                'value': features_vector[i],
            }

        return explanations

    def save(self, filepath=None):
        """Save model to disk."""
        if self.model is None:
            raise ValueError('No model to save.')
        os.makedirs(MODEL_DIR, exist_ok=True)
        filepath = filepath or os.path.join(MODEL_DIR, 'isolation_forest.joblib')
        joblib.dump(self.model, filepath)
        logger.info('Model saved to %s', filepath)
        return filepath

    def load(self, filepath=None):
        """Load model from disk."""
        filepath = filepath or os.path.join(MODEL_DIR, 'isolation_forest.joblib')
        if not os.path.exists(filepath):
            logger.warning('Model file not found at %s', filepath)
            return False
        self.model = joblib.load(filepath)
        logger.info('Model loaded from %s', filepath)
        return True
