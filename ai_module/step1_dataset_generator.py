"""
Step 1: Generate synthetic activity log dataset for AI model training.
Creates 2994 records simulating normal and anomalous user behavior.
TZ spec: 9 parameters (failed_logins, docs_accessed, session_duration_min,
day_of_week, download_mb, own_section, role, confession_type, is_anomaly).
"""
import csv
import random
from datetime import datetime, timedelta

OUTPUT_FILE = 'dataset_activity_logs.csv'
NUM_NORMAL = 2700
NUM_ANOMALOUS = 294  # ~10% anomalies

USERS = [f'user_{i}@scp.local' for i in range(1, 51)]

# TZ roles encoded
ROLES = {
    'super_admin': 1,
    'qomita_rahbar': 2,
    'qomita_xodimi': 3,
    'konfessiya_rahbari': 4,
    'konfessiya_xodimi': 5,
    'adliya_xodimi': 6,
    'kengash_azo': 7,
}

# TZ confession types
CONFESSION_TYPES = {
    'diniy': 1,
    'fuqarolik': 2,
}


def generate_normal_record():
    """Generate a single normal activity record with TZ-spec features."""
    return {
        'user': random.choice(USERS),
        'failed_logins': 0,
        'docs_accessed': random.randint(0, 10),
        'session_duration_min': round(random.uniform(5, 120), 1),
        'day_of_week': random.randint(0, 4),  # Working days (Mon-Fri)
        'download_mb': round(random.uniform(0, 50), 2),
        'own_section': round(random.uniform(0.8, 1.0), 2),  # Mostly own section
        'role': random.choice(list(ROLES.values())),
        'confession_type': random.choice(list(CONFESSION_TYPES.values())),
        'is_anomaly': 0,
    }


def generate_anomalous_record():
    """Generate a single anomalous activity record."""
    anomaly_type = random.choice([
        'mass_download', 'off_hours', 'brute_force', 'cross_section', 'excessive_docs'
    ])

    record = generate_normal_record()
    record['is_anomaly'] = 1

    if anomaly_type == 'mass_download':
        record['download_mb'] = round(random.uniform(500, 2000), 2)
        record['docs_accessed'] = random.randint(30, 100)
    elif anomaly_type == 'off_hours':
        record['day_of_week'] = random.choice([5, 6])  # Weekend
        record['session_duration_min'] = round(random.uniform(200, 480), 1)
    elif anomaly_type == 'brute_force':
        record['failed_logins'] = random.randint(5, 30)
    elif anomaly_type == 'cross_section':
        record['own_section'] = round(random.uniform(0.0, 0.3), 2)  # Accessing other sections
        record['docs_accessed'] = random.randint(15, 50)
    elif anomaly_type == 'excessive_docs':
        record['docs_accessed'] = random.randint(50, 200)
        record['session_duration_min'] = round(random.uniform(10, 30), 1)  # Short session, many docs

    return record


def main():
    records = []

    for _ in range(NUM_NORMAL):
        records.append(generate_normal_record())

    for _ in range(NUM_ANOMALOUS):
        records.append(generate_anomalous_record())

    random.shuffle(records)

    fieldnames = [
        'user', 'failed_logins', 'docs_accessed', 'session_duration_min',
        'day_of_week', 'download_mb', 'own_section', 'role',
        'confession_type', 'is_anomaly',
    ]

    with open(OUTPUT_FILE, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f'Dataset generated: {len(records)} records ({NUM_NORMAL} normal, {NUM_ANOMALOUS} anomalous)')
    print(f'Saved to: {OUTPUT_FILE}')


if __name__ == '__main__':
    main()
