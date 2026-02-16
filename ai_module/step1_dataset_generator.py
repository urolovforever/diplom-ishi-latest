"""
Step 1: Generate synthetic activity log dataset for AI model training.
Creates 2994 records simulating normal and anomalous user behavior.
"""
import csv
import random
from datetime import datetime, timedelta

OUTPUT_FILE = 'dataset_activity_logs.csv'
NUM_NORMAL = 2700
NUM_ANOMALOUS = 294  # ~10% anomalies

USERS = [f'user_{i}@scp.local' for i in range(1, 51)]
ENDPOINTS = [
    '/api/confessions/', '/api/documents/', '/api/accounts/profile/',
    '/api/notifications/', '/api/audit/logs/', '/api/confessions/organizations/',
    '/api/documents/access-logs/', '/api/ai-security/dashboard/',
]
METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']


def generate_normal_record():
    """Generate a single normal activity record."""
    return {
        'user': random.choice(USERS),
        'request_count_per_hour': random.randint(5, 50),
        'unique_endpoints': random.randint(1, 5),
        'time_of_day': random.randint(8, 18),  # Working hours
        'error_rate': round(random.uniform(0.0, 0.1), 4),
        'avg_payload_size': round(random.uniform(100, 5000), 2),
        'docs_accessed': random.randint(0, 10),
        'download_count': random.randint(0, 5),
        'failed_logins': 0,
        'is_anomaly': 0,
    }


def generate_anomalous_record():
    """Generate a single anomalous activity record."""
    anomaly_type = random.choice([
        'mass_download', 'off_hours', 'brute_force', 'endpoint_scan', 'high_error'
    ])

    record = generate_normal_record()
    record['is_anomaly'] = 1

    if anomaly_type == 'mass_download':
        record['request_count_per_hour'] = random.randint(200, 500)
        record['download_count'] = random.randint(50, 200)
        record['docs_accessed'] = random.randint(30, 100)
    elif anomaly_type == 'off_hours':
        record['time_of_day'] = random.choice([0, 1, 2, 3, 4, 5, 23])
        record['request_count_per_hour'] = random.randint(20, 100)
    elif anomaly_type == 'brute_force':
        record['failed_logins'] = random.randint(5, 30)
        record['error_rate'] = round(random.uniform(0.5, 1.0), 4)
    elif anomaly_type == 'endpoint_scan':
        record['unique_endpoints'] = random.randint(15, 30)
        record['request_count_per_hour'] = random.randint(100, 300)
    elif anomaly_type == 'high_error':
        record['error_rate'] = round(random.uniform(0.4, 0.9), 4)
        record['request_count_per_hour'] = random.randint(50, 150)

    return record


def main():
    records = []

    for _ in range(NUM_NORMAL):
        records.append(generate_normal_record())

    for _ in range(NUM_ANOMALOUS):
        records.append(generate_anomalous_record())

    random.shuffle(records)

    fieldnames = [
        'user', 'request_count_per_hour', 'unique_endpoints', 'time_of_day',
        'error_rate', 'avg_payload_size', 'docs_accessed', 'download_count',
        'failed_logins', 'is_anomaly',
    ]

    with open(OUTPUT_FILE, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f'Dataset generated: {len(records)} records ({NUM_NORMAL} normal, {NUM_ANOMALOUS} anomalous)')
    print(f'Saved to: {OUTPUT_FILE}')


if __name__ == '__main__':
    main()
