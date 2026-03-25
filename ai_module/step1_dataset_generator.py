"""
Step 1: Generate synthetic activity log dataset for AI model training.
Creates ~3000 records simulating normal and anomalous user behavior.
15 features: failed_logins, requests_count, docs_accessed, docs_downloaded,
hour_of_day, error_rate, unique_endpoints, session_duration_min,
sensitive_docs_accessed, distinct_ips, share_actions, admin_actions,
password_reset_delay_min, e2e_key_failures, repeated_doc_downloads.
"""
import csv
import random

OUTPUT_FILE = 'dataset_activity_logs.csv'
NUM_NORMAL = 2700
NUM_ANOMALOUS = 300  # ~10% anomalies

USERS = [f'user_{i}@scp.local' for i in range(1, 51)]


def generate_normal_record():
    """Generate a single normal activity record with 15 features."""
    return {
        'user': random.choice(USERS),
        'failed_logins': 0,
        'requests_count': random.randint(10, 100),
        'docs_accessed': random.randint(0, 10),
        'docs_downloaded': random.randint(0, 5),
        'hour_of_day': random.randint(9, 17),
        'error_rate': round(random.uniform(0, 0.05), 3),
        'unique_endpoints': random.randint(3, 10),
        'session_duration_min': round(random.uniform(5, 120), 1),
        'sensitive_docs_accessed': random.randint(0, 2),
        'distinct_ips': 1,
        'share_actions': random.randint(0, 3),
        'admin_actions': 0,
        'password_reset_delay_min': 0,
        'e2e_key_failures': 0,
        'repeated_doc_downloads': random.randint(0, 2),
        'is_anomaly': 0,
    }


def generate_borderline_normal_record():
    """Generate a normal record near the decision boundary."""
    record = generate_normal_record()
    variant = random.choice([
        'high_docs', 'long_session', 'some_errors', 'extra_ips',
    ])

    if variant == 'high_docs':
        record['docs_accessed'] = random.randint(8, 15)
        record['docs_downloaded'] = random.randint(3, 7)
    elif variant == 'long_session':
        record['session_duration_min'] = round(random.uniform(100, 180), 1)
    elif variant == 'some_errors':
        record['error_rate'] = round(random.uniform(0.03, 0.1), 3)
    elif variant == 'extra_ips':
        record['distinct_ips'] = random.randint(2, 3)

    return record


def generate_anomalous_record():
    """Generate a single anomalous activity record."""
    anomaly_type = random.choice([
        'mass_download', 'off_hours', 'brute_force', 'scanning',
        'data_exfiltration', 'credential_theft', 'admin_abuse', 'compound',
    ])

    record = generate_normal_record()
    record['is_anomaly'] = 1

    if anomaly_type == 'mass_download':
        record['docs_downloaded'] = random.randint(20, 80)
        record['docs_accessed'] = random.randint(15, 60)
        record['repeated_doc_downloads'] = random.randint(5, 20)

    elif anomaly_type == 'off_hours':
        record['hour_of_day'] = random.choice(
            list(range(0, 7)) + list(range(22, 24))
        )
        record['session_duration_min'] = round(random.uniform(120, 360), 1)

    elif anomaly_type == 'brute_force':
        record['failed_logins'] = random.randint(5, 20)
        record['e2e_key_failures'] = random.randint(3, 10)
        record['error_rate'] = round(random.uniform(0.3, 0.8), 3)

    elif anomaly_type == 'scanning':
        record['unique_endpoints'] = random.randint(15, 30)
        record['error_rate'] = round(random.uniform(0.3, 0.8), 3)
        record['requests_count'] = random.randint(200, 500)

    elif anomaly_type == 'data_exfiltration':
        record['docs_downloaded'] = random.randint(15, 50)
        record['share_actions'] = random.randint(5, 15)
        record['sensitive_docs_accessed'] = random.randint(5, 20)

    elif anomaly_type == 'credential_theft':
        record['password_reset_delay_min'] = round(random.uniform(0.01, 0.5), 3)
        record['distinct_ips'] = random.randint(3, 8)
        record['failed_logins'] = random.randint(2, 8)

    elif anomaly_type == 'admin_abuse':
        record['admin_actions'] = random.randint(5, 20)
        record['unique_endpoints'] = random.randint(15, 25)

    elif anomaly_type == 'compound':
        record['docs_downloaded'] = random.randint(10, 30)
        record['sensitive_docs_accessed'] = random.randint(3, 10)
        record['share_actions'] = random.randint(3, 8)
        record['error_rate'] = round(random.uniform(0.1, 0.4), 3)
        if random.random() < 0.5:
            record['failed_logins'] = random.randint(2, 8)
        if random.random() < 0.3:
            record['hour_of_day'] = random.choice([0, 1, 2, 3, 4, 5, 23])

    return record


def main():
    records = []

    # ~80% pure normal, ~10% borderline normal, ~10% anomalous
    num_borderline = NUM_NORMAL // 10  # 270 borderline normal records
    num_pure_normal = NUM_NORMAL - num_borderline

    for _ in range(num_pure_normal):
        records.append(generate_normal_record())

    for _ in range(num_borderline):
        records.append(generate_borderline_normal_record())

    for _ in range(NUM_ANOMALOUS):
        records.append(generate_anomalous_record())

    random.shuffle(records)

    fieldnames = [
        'user', 'failed_logins', 'requests_count', 'docs_accessed',
        'docs_downloaded', 'hour_of_day', 'error_rate', 'unique_endpoints',
        'session_duration_min', 'sensitive_docs_accessed', 'distinct_ips',
        'share_actions', 'admin_actions', 'password_reset_delay_min',
        'e2e_key_failures', 'repeated_doc_downloads', 'is_anomaly',
    ]

    with open(OUTPUT_FILE, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f'Dataset generated: {len(records)} records ({NUM_NORMAL} normal, {NUM_ANOMALOUS} anomalous)')
    print(f'Saved to: {OUTPUT_FILE}')


if __name__ == '__main__':
    main()
