"""
Step 2: Train and evaluate Isolation Forest model for anomaly detection.
Reads dataset from step1, trains model, evaluates metrics, saves results.
TZ spec: 9 parameters with max_samples=256.
"""
import csv
import json
import os

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, confusion_matrix, precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

DATASET_FILE = 'dataset_activity_logs.csv'
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend', 'ml_models')
MODEL_FILE = os.path.join(MODEL_DIR, 'isolation_forest.joblib')
SCALER_FILE = os.path.join(MODEL_DIR, 'scaler.joblib')
HISTORY_FILE = os.path.join(MODEL_DIR, 'training_history.json')
RESULTS_FILE = 'dataset_with_predictions.csv'

# TZ: 8 feature columns (is_anomaly is the label, not a feature for training)
FEATURE_COLUMNS = [
    'failed_logins', 'docs_accessed', 'session_duration_min',
    'day_of_week', 'download_mb', 'own_section', 'role',
    'confession_type',
]


def load_dataset():
    """Load and parse CSV dataset."""
    data = []
    with open(DATASET_FILE, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append(row)
    return data


def prepare_features(data):
    """Extract feature matrix and labels."""
    X = []
    y = []
    for row in data:
        features = [float(row[col]) for col in FEATURE_COLUMNS]
        X.append(features)
        y.append(int(row['is_anomaly']))
    return np.array(X), np.array(y)


def train_model(X_train):
    """Train Isolation Forest model with TZ parameters."""
    model = IsolationForest(
        n_estimators=200,
        contamination=0.1,
        max_samples=256,  # TZ requirement
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train)
    return model


def evaluate_model(model, scaler, X_test, y_test):
    """Evaluate model and print metrics."""
    X_scaled = scaler.transform(X_test)
    predictions = model.predict(X_scaled)
    # IsolationForest: 1 = normal, -1 = anomaly
    y_pred = [1 if p == -1 else 0 for p in predictions]

    print('\n=== Model Evaluation ===')
    print(f'Precision: {precision_score(y_test, y_pred):.4f}')
    print(f'Recall:    {recall_score(y_test, y_pred):.4f}')
    print(f'F1 Score:  {f1_score(y_test, y_pred):.4f}')
    print(f'\nConfusion Matrix:\n{confusion_matrix(y_test, y_pred)}')
    print(f'\nClassification Report:\n{classification_report(y_test, y_pred, target_names=["Normal", "Anomaly"])}')

    return {
        'precision': float(precision_score(y_test, y_pred)),
        'recall': float(recall_score(y_test, y_pred)),
        'f1': float(f1_score(y_test, y_pred)),
    }


def save_predictions(data, model, scaler):
    """Save dataset with predictions and anomaly scores."""
    X, _ = prepare_features(data)
    X_scaled = scaler.transform(X)

    predictions = model.predict(X_scaled)
    scores = model.decision_function(X_scaled)

    fieldnames = list(data[0].keys()) + ['predicted_anomaly', 'anomaly_score']

    with open(RESULTS_FILE, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for i, row in enumerate(data):
            row['predicted_anomaly'] = 1 if predictions[i] == -1 else 0
            row['anomaly_score'] = f'{scores[i]:.6f}'
            writer.writerow(row)

    print(f'\nPredictions saved to: {RESULTS_FILE}')


def main():
    print('Loading dataset...')
    data = load_dataset()
    print(f'Loaded {len(data)} records')

    X, y = prepare_features(data)
    print(f'Features shape: {X.shape}')
    print(f'Anomalies: {sum(y)} ({sum(y)/len(y)*100:.1f}%)')

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y,
    )

    print(f'\nTraining set: {len(X_train)}, Test set: {len(X_test)}')

    # Train
    print('Training Isolation Forest...')
    model = train_model(X_train)

    # Evaluate
    metrics = evaluate_model(model, scaler, X_test, y_test)

    # Save model and scaler
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_FILE)
    joblib.dump(scaler, SCALER_FILE)
    print(f'\nModel saved to: {MODEL_FILE}')
    print(f'Scaler saved to: {SCALER_FILE}')

    # Save training history
    history = {
        'model_type': 'IsolationForest',
        'n_estimators': 200,
        'contamination': 0.1,
        'max_samples': 256,
        'features': FEATURE_COLUMNS,
        'dataset_size': len(data),
        'train_size': len(X_train),
        'test_size': len(X_test),
        'metrics': metrics,
    }
    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f, indent=2)

    # Save predictions
    save_predictions(data, model, scaler)

    return metrics


if __name__ == '__main__':
    main()
