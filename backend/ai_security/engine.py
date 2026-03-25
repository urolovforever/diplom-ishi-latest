import glob
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
MAX_MODEL_VERSIONS = 5


class IsolationForestEngine:

    def __init__(self, contamination=0.05, n_estimators=200, max_samples=256, random_state=42):
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

        if X.shape[1] != len(FEATURE_NAMES):
            raise ValueError(
                f'Feature dimension mismatch: expected {len(FEATURE_NAMES)}, got {X.shape[1]}'
            )

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

        features_vector = list(features_vector)
        if len(features_vector) != len(FEATURE_NAMES):
            raise ValueError(
                f'Feature dimension mismatch: expected {len(FEATURE_NAMES)}, got {len(features_vector)}'
            )

        X = np.array([features_vector])
        if self.scaler is not None:
            X = self.scaler.transform(X)
        score = self.model.decision_function(X)[0]
        return float(score)

    def predict_normalized(self, features_vector):
        """Return normalized anomaly score (0-1, higher = more anomalous)."""
        raw_score = self.predict(features_vector)
        # IF decision_function: negative = anomaly, positive = normal
        # Normalize using offset_score for more stable bounds
        normalized = max(0.0, min(1.0, 0.5 - raw_score / 2.0))
        return round(normalized, 6)

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

    def evaluate(self, feature_matrix, y_true=None):
        """Evaluate model on given data. Returns precision, recall, F1 metrics.

        If y_true is provided, computes real supervised metrics.
        Otherwise, falls back to unsupervised statistics.
        """
        if self.model is None:
            return {}

        try:
            from sklearn.metrics import precision_score, recall_score, f1_score

            X = np.array(feature_matrix)
            if self.scaler is not None:
                X = self.scaler.transform(X)

            predictions = self.model.predict(X)
            scores = self.model.decision_function(X)

            # IsolationForest: -1 = anomaly, 1 = normal → convert to 0/1
            y_pred = (predictions == -1).astype(int)

            n_anomalies = int(y_pred.sum())
            n_total = len(predictions)
            anomaly_rate = n_anomalies / n_total if n_total > 0 else 0
            avg_score = float(scores.mean())
            std_score = float(scores.std())

            result = {
                'total_samples': n_total,
                'detected_anomalies': n_anomalies,
                'anomaly_rate': round(anomaly_rate, 4),
                'avg_score': round(avg_score, 4),
                'std_score': round(std_score, 4),
            }

            if y_true is not None:
                y_true = np.array(y_true)
                result['precision'] = round(float(precision_score(y_true, y_pred, zero_division=0)), 4)
                result['recall'] = round(float(recall_score(y_true, y_pred, zero_division=0)), 4)
                result['f1'] = round(float(f1_score(y_true, y_pred, zero_division=0)), 4)
            else:
                result['precision'] = None
                result['recall'] = None
                result['f1'] = None

            return result
        except Exception as e:
            logger.error('Model evaluation failed: %s', e)
            return {}

    def save(self, filepath=None, version_tag=None):
        """Save model and scaler to disk with optional versioning."""
        if self.model is None:
            raise ValueError('No model to save.')
        os.makedirs(MODEL_DIR, exist_ok=True)

        if version_tag:
            model_filename = f'isolation_forest_{version_tag}.joblib'
            scaler_filename = f'scaler_{version_tag}.joblib'
        else:
            model_filename = 'isolation_forest.joblib'
            scaler_filename = 'scaler.joblib'

        filepath = filepath or os.path.join(MODEL_DIR, model_filename)
        scaler_path = os.path.join(MODEL_DIR, scaler_filename)

        joblib.dump(self.model, filepath)
        if self.scaler is not None:
            joblib.dump(self.scaler, scaler_path)

        # Also save as "latest" for easy loading
        latest_path = os.path.join(MODEL_DIR, 'isolation_forest.joblib')
        latest_scaler = os.path.join(MODEL_DIR, 'scaler.joblib')
        joblib.dump(self.model, latest_path)
        if self.scaler is not None:
            joblib.dump(self.scaler, latest_scaler)

        # Cleanup old versions (keep MAX_MODEL_VERSIONS)
        self._cleanup_old_versions()

        logger.info('Model saved to %s (version: %s)', filepath, version_tag or 'latest')
        return filepath

    def load(self, filepath=None):
        """Load model and scaler from disk."""
        filepath = filepath or os.path.join(MODEL_DIR, 'isolation_forest.joblib')
        scaler_path = os.path.join(MODEL_DIR, 'scaler.joblib')

        if not os.path.exists(filepath):
            logger.warning('Model file not found at %s', filepath)
            return False

        try:
            self.model = joblib.load(filepath)
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
            logger.info('Model loaded from %s', filepath)
            return True
        except Exception as e:
            logger.error('Failed to load model from %s: %s', filepath, e)
            self.model = None
            self.scaler = None
            return False

    @staticmethod
    def list_versions():
        """List all available model versions sorted by date (newest first)."""
        pattern = os.path.join(MODEL_DIR, 'isolation_forest_*.joblib')
        files = glob.glob(pattern)
        versions = []
        for f in sorted(files, reverse=True):
            basename = os.path.basename(f)
            tag = basename.replace('isolation_forest_', '').replace('.joblib', '')
            versions.append({
                'version': tag,
                'path': f,
                'size_bytes': os.path.getsize(f),
            })
        return versions

    def rollback(self, version_tag):
        """Rollback to a specific model version."""
        filepath = os.path.join(MODEL_DIR, f'isolation_forest_{version_tag}.joblib')
        scaler_path = os.path.join(MODEL_DIR, f'scaler_{version_tag}.joblib')

        if not os.path.exists(filepath):
            raise FileNotFoundError(f'Model version {version_tag} not found')

        self.model = joblib.load(filepath)
        if os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)

        # Copy to latest
        latest_path = os.path.join(MODEL_DIR, 'isolation_forest.joblib')
        latest_scaler = os.path.join(MODEL_DIR, 'scaler.joblib')
        joblib.dump(self.model, latest_path)
        if self.scaler is not None:
            joblib.dump(self.scaler, latest_scaler)

        logger.info('Rolled back to model version %s', version_tag)
        return True

    @staticmethod
    def _cleanup_old_versions():
        """Remove old model versions beyond MAX_MODEL_VERSIONS."""
        pattern = os.path.join(MODEL_DIR, 'isolation_forest_*.joblib')
        files = sorted(glob.glob(pattern), reverse=True)
        for old_file in files[MAX_MODEL_VERSIONS:]:
            try:
                os.remove(old_file)
                # Also remove corresponding scaler
                scaler_file = old_file.replace('isolation_forest_', 'scaler_')
                if os.path.exists(scaler_file):
                    os.remove(scaler_file)
                logger.info('Removed old model version: %s', os.path.basename(old_file))
            except OSError as e:
                logger.warning('Failed to remove old model %s: %s', old_file, e)
