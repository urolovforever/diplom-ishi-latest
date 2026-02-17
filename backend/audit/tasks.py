"""
TZ requirement: Daily encrypted database backup.
Creates a compressed and encrypted backup of the database.
"""
import gzip
import logging
import os
import subprocess
from datetime import datetime

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

BACKUP_DIR = os.path.join(settings.BASE_DIR, 'backups')


@shared_task
def daily_encrypted_backup():
    """Create a daily encrypted backup of the PostgreSQL database."""
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        db_settings = settings.DATABASES['default']

        dump_file = os.path.join(BACKUP_DIR, f'backup_{timestamp}.sql')
        gz_file = f'{dump_file}.gz'
        enc_file = f'{gz_file}.enc'

        # Step 1: Create PostgreSQL dump
        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']

        dump_cmd = [
            'pg_dump',
            '-h', db_settings.get('HOST', 'localhost'),
            '-p', str(db_settings.get('PORT', '5432')),
            '-U', db_settings['USER'],
            '-d', db_settings['NAME'],
            '-F', 'c',  # Custom format (compressed)
            '-f', dump_file,
        ]

        result = subprocess.run(
            dump_cmd, env=env, capture_output=True, text=True, timeout=600,
        )

        if result.returncode != 0:
            logger.error('pg_dump failed: %s', result.stderr)
            return {'status': 'error', 'message': result.stderr}

        # Step 2: Compress with gzip
        with open(dump_file, 'rb') as f_in:
            with gzip.open(gz_file, 'wb') as f_out:
                f_out.write(f_in.read())
        os.remove(dump_file)

        # Step 3: Encrypt with openssl AES-256-CBC
        backup_key = os.environ.get('BACKUP_ENCRYPTION_KEY', settings.SECRET_KEY)
        encrypt_cmd = [
            'openssl', 'enc', '-aes-256-cbc', '-salt', '-pbkdf2',
            '-in', gz_file,
            '-out', enc_file,
            '-pass', f'pass:{backup_key}',
        ]

        result = subprocess.run(
            encrypt_cmd, capture_output=True, text=True, timeout=300,
        )

        if result.returncode != 0:
            logger.error('Encryption failed: %s', result.stderr)
            return {'status': 'error', 'message': result.stderr}

        os.remove(gz_file)

        file_size = os.path.getsize(enc_file)
        logger.info(
            'Encrypted backup created: %s (%.2f MB)',
            enc_file, file_size / (1024 * 1024),
        )

        # Step 4: Clean up old backups (keep last 30)
        cleanup_old_backups(max_keep=30)

        return {
            'status': 'success',
            'file': enc_file,
            'size_mb': round(file_size / (1024 * 1024), 2),
            'timestamp': timestamp,
        }

    except Exception as e:
        logger.error('Backup failed: %s', e)
        return {'status': 'error', 'message': str(e)}


def cleanup_old_backups(max_keep=30):
    """Remove old backup files, keeping only the most recent ones."""
    try:
        if not os.path.exists(BACKUP_DIR):
            return

        backups = sorted(
            [f for f in os.listdir(BACKUP_DIR) if f.endswith('.enc')],
            reverse=True,
        )

        for old_backup in backups[max_keep:]:
            path = os.path.join(BACKUP_DIR, old_backup)
            os.remove(path)
            logger.info('Removed old backup: %s', old_backup)

    except Exception as e:
        logger.error('Backup cleanup failed: %s', e)


@shared_task
def restore_backup(backup_file):
    """Restore database from an encrypted backup file."""
    try:
        db_settings = settings.DATABASES['default']
        backup_key = os.environ.get('BACKUP_ENCRYPTION_KEY', settings.SECRET_KEY)

        gz_file = backup_file.replace('.enc', '')
        dump_file = gz_file.replace('.gz', '')

        # Step 1: Decrypt
        decrypt_cmd = [
            'openssl', 'enc', '-aes-256-cbc', '-d', '-salt', '-pbkdf2',
            '-in', backup_file,
            '-out', gz_file,
            '-pass', f'pass:{backup_key}',
        ]
        subprocess.run(decrypt_cmd, check=True, capture_output=True, timeout=300)

        # Step 2: Decompress
        with gzip.open(gz_file, 'rb') as f_in:
            with open(dump_file, 'wb') as f_out:
                f_out.write(f_in.read())
        os.remove(gz_file)

        # Step 3: Restore
        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']

        restore_cmd = [
            'pg_restore',
            '-h', db_settings.get('HOST', 'localhost'),
            '-p', str(db_settings.get('PORT', '5432')),
            '-U', db_settings['USER'],
            '-d', db_settings['NAME'],
            '-c',  # Clean (drop) existing objects
            dump_file,
        ]
        subprocess.run(restore_cmd, env=env, check=True, capture_output=True, timeout=600)
        os.remove(dump_file)

        logger.info('Database restored from: %s', backup_file)
        return {'status': 'success', 'file': backup_file}

    except Exception as e:
        logger.error('Restore failed: %s', e)
        return {'status': 'error', 'message': str(e)}
