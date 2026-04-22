"""Seed rich demo data for BMI (bachelor's thesis) defense presentation.

Creates:
    - Extra users across every role (passwords AdminPass123!)
    - Additional confessions / organizations
    - Documents with varied security levels and categories
    - DocumentShare + DocumentAccessLog entries
    - ActivityLog entries spread over the past 30 days (normal + anomalous)
    - AnomalyReport entries with realistic feature JSON
    - Notification, AuditLog, AlertRule, HoneypotFile records
    - LoginAttempt records (some failed bursts)

Safe to run multiple times — uses get_or_create and count checks.
"""
import random
import uuid
from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import CustomUser, LoginAttempt, Role


class _DisableAutoNowAdd:
    """Temporarily turn off auto_now_add on a model's datetime field so bulk_create respects our dates."""

    def __init__(self, model, field_name):
        self.field = model._meta.get_field(field_name)

    def __enter__(self):
        self._orig = self.field.auto_now_add
        self.field.auto_now_add = False
        return self

    def __exit__(self, *exc):
        self.field.auto_now_add = self._orig
from ai_security.models import ActivityLog, AIModelConfig, AnomalyReport
from audit.models import AuditLog
from confessions.models import Confession, Organization
from documents.models import (
    Document,
    DocumentAccessLog,
    DocumentShare,
    HoneypotFile,
)
from notifications.models import AlertRule, Notification


IP_POOL = [
    '10.0.0.12', '10.0.0.45', '10.0.0.78', '10.0.0.91',
    '192.168.1.100', '192.168.1.105', '192.168.1.110',
    '213.230.70.14', '91.203.112.88', '185.213.90.44',
]

SUSPICIOUS_IPS = [
    '45.155.205.12', '103.45.78.99', '185.220.101.42',  # tor-ish
    '94.102.49.193', '162.247.74.27',
]

USER_AGENTS = [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
]

NORMAL_ACTIONS = [
    ('login', 'POST', '/api/auth/login/', 200),
    ('view_dashboard', 'GET', '/api/dashboard/', 200),
    ('list_documents', 'GET', '/api/documents/', 200),
    ('view_document', 'GET', '/api/documents/{id}/', 200),
    ('download_document', 'GET', '/api/documents/{id}/download/', 200),
    ('list_notifications', 'GET', '/api/notifications/', 200),
    ('view_profile', 'GET', '/api/accounts/me/', 200),
    ('list_organizations', 'GET', '/api/confessions/organizations/', 200),
    ('list_reports', 'GET', '/api/audit/reports/', 200),
    ('view_audit_log', 'GET', '/api/audit/logs/', 200),
]

ANOMALOUS_ACTIONS = [
    ('download_document', 'GET', '/api/documents/{id}/download/', 200),
    ('view_sensitive_document', 'GET', '/api/documents/{id}/', 200),
    ('failed_login', 'POST', '/api/auth/login/', 401),
    ('access_forbidden', 'GET', '/api/admin/users/', 403),
    ('bulk_export', 'POST', '/api/documents/export/', 200),
]

DOCUMENT_TITLES = [
    ("Ro'yxatdan o'tish guvohnomasi", 'registration', 'confidential'),
    ("2024-yil yillik hisobot", 'reports', 'internal'),
    ("Diniy tashkilot nizomi", 'normative', 'confidential'),
    ("Moliyaviy hisobot Q4 2024", 'reports', 'secret'),
    ("Xodimlar ro'yxati", 'registration', 'confidential'),
    ("Jamoat uchun ochiq bayonot", 'normative', 'public'),
    ("Ichki yo'riqnoma", 'normative', 'internal'),
    ("Oylik faoliyat hisoboti", 'reports', 'internal'),
    ("Maxfiy yig'ilish bayonnomasi", 'confidential', 'secret'),
    ("Lisenziya nusxasi", 'registration', 'internal'),
    ("Ta'sischilar majlisining qarori", 'normative', 'confidential'),
    ("Soliq deklaratsiyasi 2024", 'reports', 'secret'),
    ("Madaniy dastur rejasi", 'normative', 'public'),
    ("Xayriya jamg'armasi hisoboti", 'reports', 'internal'),
    ("Binolar ro'yxati va hujjatlari", 'registration', 'confidential'),
    ("Tashkilotlararo hamkorlik shartnomasi", 'normative', 'confidential'),
    ("Byudjet rejasi 2025", 'reports', 'secret'),
    ("Ichki audit natijalari", 'reports', 'secret'),
    ("Ommaviy tadbir loyihasi", 'normative', 'public'),
    ("Xodimlar ta'limi dasturi", 'normative', 'internal'),
]

NOTIFICATION_SAMPLES = [
    ('Yangi hujjat ulashildi', 'Sizga yangi hujjat ulashildi, ko\'rib chiqing', 'info'),
    ('Ogohlantirish: g\'ayrioddiy kirish', 'Tanimagan qurilmadan kirish urinishi aniqlandi', 'warning'),
    ('Anomaliya aniqlandi', 'Tizim g\'ayrioddiy xulq-atvor aniqladi. Admin xabardor qilindi', 'alert'),
    ('Parolingiz muddati tugaydi', '7 kun ichida parolingizni yangilang', 'warning'),
    ('Yangi sessiya ochildi', 'Sizning akkauntingizga yangi qurilmadan kirildi', 'info'),
    ('Hujjat yangilandi', 'Sizga tegishli hujjat yangi versiyasi yuklandi', 'info'),
    ('Honeypot fayli ochildi', 'Jarayonda honeypot fayliga ruxsatsiz kirish urinildi', 'alert'),
    ('Tizim yangilanishi', 'Tizim ertaga 02:00 da texnik xizmat uchun to\'xtatiladi', 'system'),
]


class Command(BaseCommand):
    help = 'Seed rich demo data for thesis defense (users, docs, activity, anomalies)'

    def add_arguments(self, parser):
        parser.add_argument('--reset-activity', action='store_true',
                            help='Delete existing ActivityLog / AnomalyReport rows before seeding')

    @transaction.atomic
    def handle(self, *args, **options):
        now = timezone.now()

        # ---- Base data (roles, seed users, confessions) ----
        call_command('seed_data')
        self.stdout.write(self.style.SUCCESS('[1/9] Base roles/confessions/users ensured'))

        confessions = list(Confession.objects.all())
        organizations = list(Organization.objects.all())

        # ---- Extra confessions & orgs ----
        extra_confessions = [
            ("Buddizm konfessiyasi", "O'zbekistondagi buddistlar jamoasi"),
            ("Baxoiylar konfessiyasi", "O'zbekistondagi baxoiylar jamoasi"),
        ]
        for name, desc in extra_confessions:
            conf, created = Confession.objects.get_or_create(
                name=name, defaults={'description': desc},
            )
            if created:
                confessions.append(conf)

        extra_orgs = [
            ("Islom konfessiyasi", "Farg'ona Mulla Qirg'iz masjidi"),
            ("Islom konfessiyasi", "Xiva Juma masjidi"),
            ("Xristian konfessiyasi", "Toshkent katolik cherkovi"),
            ("Xristian konfessiyasi", "Samarqand baptist jamoasi"),
            ("Buddizm konfessiyasi", "Toshkent budda markazi"),
            ("Baxoiylar konfessiyasi", "Toshkent baxoiy jamoasi"),
        ]
        for conf_name, org_name in extra_orgs:
            try:
                conf = Confession.objects.get(name=conf_name)
            except Confession.DoesNotExist:
                continue
            org, created = Organization.objects.get_or_create(
                name=org_name,
                defaults={'confession': conf, 'description': f'{org_name}ning rasmiy bo\'limi'},
            )
            if created:
                organizations.append(org)

        self.stdout.write(self.style.SUCCESS(
            f'[2/9] Confessions={len(confessions)}, Organizations={len(organizations)}'))

        # ---- Extra users (one per extra org + spare xodim) ----
        extra_users_data = []
        first_names = ['Akmal', 'Javlon', 'Nodira', 'Malika', 'Shuhrat', 'Dilnoza',
                       'Aziza', 'Farrux', 'Umida', 'Bekzod', 'Rustam', 'Gulnora']
        last_names = ['Karimov', 'Rahmonov', 'Yusupova', 'Tursunov', 'Salimov',
                      'Ergasheva', 'Xamidov', 'Nosirova', 'Abdullayev', 'Qodirova']
        role_dt_rahbar = Role.objects.get(name=Role.DT_RAHBAR)
        role_dt_xodim = Role.objects.get(name=Role.DT_XODIMI)
        role_konf_rahbar = Role.objects.get(name=Role.KONFESSIYA_RAHBARI)
        role_konf_xodim = Role.objects.get(name=Role.KONFESSIYA_XODIMI)

        # Konfessiya leaders for each confession that has no leader yet
        for idx, conf in enumerate(confessions):
            if conf.leader_id:
                continue
            fn = first_names[idx % len(first_names)]
            ln = last_names[idx % len(last_names)]
            email = f'konf{idx+1}@scp.local'
            user, _ = CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': fn, 'last_name': ln,
                    'role': role_konf_rahbar, 'confession': conf,
                    'password': make_password('AdminPass123!'),
                    'is_active': True,
                    'is_2fa_enabled': False,
                    'is_2fa_confirmed': True,
                    'password_changed_at': now - timedelta(days=15),
                },
            )
            if not conf.leader_id:
                conf.leader = user
                conf.save(update_fields=['leader'])

        # DT Rahbars / Xodims for each org
        for idx, org in enumerate(organizations):
            if not org.leader_id:
                fn = first_names[(idx + 3) % len(first_names)]
                ln = last_names[(idx + 3) % len(last_names)]
                email = f'dtrahbar{idx+1}@scp.local'
                user, _ = CustomUser.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': fn, 'last_name': ln,
                        'role': role_dt_rahbar, 'organization': org,
                        'password': make_password('AdminPass123!'),
                        'is_active': True,
                        'is_2fa_enabled': False,
                        'is_2fa_confirmed': True,
                        'password_changed_at': now - timedelta(days=20),
                    },
                )
                org.leader = user
                org.save(update_fields=['leader'])

            # Two xodims per org
            for k in range(2):
                fn = first_names[(idx * 2 + k + 1) % len(first_names)]
                ln = last_names[(idx * 2 + k + 1) % len(last_names)]
                email = f'xodim{idx+1}_{k+1}@scp.local'
                CustomUser.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': fn, 'last_name': ln,
                        'role': role_dt_xodim, 'organization': org,
                        'password': make_password('AdminPass123!'),
                        'is_active': True,
                        'is_2fa_enabled': False,
                        'is_2fa_confirmed': True,
                        'password_changed_at': now - timedelta(days=random.randint(5, 60)),
                    },
                )

        # Extra konfessiya xodims
        for i, conf in enumerate(confessions[:3]):
            email = f'kxodim{i+1}@scp.local'
            CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first_names[(i + 5) % len(first_names)],
                    'last_name': last_names[(i + 5) % len(last_names)],
                    'role': role_konf_xodim, 'confession': conf,
                    'password': make_password('AdminPass123!'),
                    'is_active': True,
                    'is_2fa_enabled': False,
                    'is_2fa_confirmed': True,
                    'password_changed_at': now - timedelta(days=random.randint(5, 40)),
                },
            )

        all_users = list(CustomUser.objects.all())
        self.stdout.write(self.style.SUCCESS(f'[3/9] Users total: {len(all_users)}'))

        # ---- Documents ----
        admin_user = CustomUser.objects.get(email='admin@scp.local')
        for i, (title, category, sec) in enumerate(DOCUMENT_TITLES):
            org = organizations[i % len(organizations)]
            Document.objects.get_or_create(
                title=title,
                defaults={
                    'description': f'{title} — demo hujjat',
                    'file': f'documents/2025/01/seed-{i+1}.enc',
                    'uploaded_by': admin_user if i % 3 == 0 else (org.leader or admin_user),
                    'organization': org,
                    'file_size_mb': round(random.uniform(0.5, 12.0), 2),
                    'file_type': random.choice(['pdf', 'docx', 'xlsx']),
                    'is_encrypted': True,
                    'is_e2e_encrypted': sec in ('confidential', 'secret') and i % 2 == 0,
                    'security_level': sec,
                    'category': category,
                    'created_at': now - timedelta(days=random.randint(1, 45)),
                },
            )
        documents = list(Document.objects.all())
        self.stdout.write(self.style.SUCCESS(f'[4/9] Documents: {len(documents)}'))

        # ---- Document shares + access logs ----
        for doc in documents:
            # Share to 1-3 other orgs
            other_orgs = [o for o in organizations if o != doc.organization]
            for target_org in random.sample(other_orgs, k=min(random.randint(1, 3), len(other_orgs))):
                DocumentShare.objects.get_or_create(
                    document=doc, organization=target_org,
                    defaults={
                        'shared_by': doc.uploaded_by,
                        'is_read': random.random() > 0.3,
                    },
                )
        access_logs = []
        for doc in documents:
            for _ in range(random.randint(3, 15)):
                viewer = random.choice(all_users)
                access_logs.append(DocumentAccessLog(
                    document=doc, user=viewer,
                    action=random.choice(['view', 'view', 'view', 'download']),
                    ip_address=random.choice(IP_POOL),
                    created_at=now - timedelta(
                        days=random.randint(0, 30),
                        hours=random.randint(0, 23),
                        minutes=random.randint(0, 59),
                    ),
                ))
        with _DisableAutoNowAdd(DocumentAccessLog, 'created_at'):
            DocumentAccessLog.objects.bulk_create(access_logs, batch_size=500)

        self.stdout.write(self.style.SUCCESS('[5/9] Document shares & access logs created'))

        # ---- Activity logs ----
        if options.get('reset_activity'):
            ActivityLog.objects.all().delete()
            AnomalyReport.objects.all().delete()
            self.stdout.write(self.style.WARNING('    (reset) cleared previous activity/anomaly rows'))

        if ActivityLog.objects.count() < 1500:
            logs_to_create = []
            for user in all_users:
                # Normal activity over past 30 days
                for day_offset in range(30):
                    # Avg 10-30 actions per day for regular users
                    actions_per_day = random.randint(8, 35)
                    base_date = now - timedelta(days=day_offset)
                    ip = random.choice(IP_POOL)
                    ua = random.choice(USER_AGENTS)
                    for _ in range(actions_per_day):
                        action, method, path, status = random.choice(NORMAL_ACTIONS)
                        ts = base_date - timedelta(
                            hours=random.randint(0, 23),
                            minutes=random.randint(0, 59),
                            seconds=random.randint(0, 59),
                        )
                        logs_to_create.append(ActivityLog(
                            user=user, action=action,
                            resource='document' if 'document' in path else 'system',
                            resource_type='Document' if 'document' in path else '',
                            resource_id=str(random.choice(documents).id) if 'document' in path else '',
                            ip_address=ip, user_agent=ua,
                            request_method=method, request_path=path,
                            response_status=status,
                            details={'source': 'seed'},
                            metadata={'seeded': True},
                            created_at=ts,
                        ))

            with _DisableAutoNowAdd(ActivityLog, 'created_at'):
                ActivityLog.objects.bulk_create(logs_to_create, batch_size=500)
            self.stdout.write(self.style.SUCCESS(f'    +{len(logs_to_create)} normal activity logs'))
        else:
            self.stdout.write('    Normal activity logs already present, skipping')

        # Anomalous bursts — 5 users with suspicious patterns
        anomalous_users = random.sample(all_users, k=5)
        burst_patterns = []
        for au in anomalous_users:
            burst_day = now - timedelta(days=random.randint(1, 7),
                                        hours=random.randint(2, 4))  # late-night hour
            ip = random.choice(SUSPICIOUS_IPS)
            # 40-80 rapid-fire download actions
            for _ in range(random.randint(40, 80)):
                action, method, path, status = random.choice(ANOMALOUS_ACTIONS)
                burst_patterns.append(ActivityLog(
                    user=au, action=action,
                    resource='document', resource_type='Document',
                    resource_id=str(random.choice(documents).id),
                    ip_address=ip,
                    user_agent='curl/7.68.0',
                    request_method=method, request_path=path,
                    response_status=status,
                    details={'burst': True},
                    metadata={'anomalous': True},
                    created_at=burst_day + timedelta(seconds=random.randint(0, 900)),
                ))
            # Failed login burst
            for _ in range(random.randint(8, 15)):
                burst_patterns.append(ActivityLog(
                    user=au, action='failed_login',
                    resource='auth', resource_type='Session',
                    ip_address=ip,
                    user_agent='python-requests/2.31',
                    request_method='POST', request_path='/api/auth/login/',
                    response_status=401,
                    details={'brute_force_suspect': True},
                    metadata={'anomalous': True},
                    created_at=burst_day - timedelta(minutes=random.randint(5, 30)),
                ))
        with _DisableAutoNowAdd(ActivityLog, 'created_at'):
            ActivityLog.objects.bulk_create(burst_patterns, batch_size=300)
        self.stdout.write(self.style.SUCCESS(f'    +{len(burst_patterns)} anomalous activity logs'))

        # ---- Anomaly reports ----
        if AnomalyReport.objects.count() < 15:
            anomaly_samples = [
                ('critical', "G'ayrioddiy katta hajmdagi hujjat yuklash",
                 '24 soat ichida 60+ maxfiy hujjat yuklab olindi (normal: 2-5)', 0.92),
                ('critical', "Tunda tizimga kirish — tanimagan IP",
                 '03:17 da suspicious IP (45.155.205.12) orqali kirish', 0.88),
                ('high', "Ko'p muvaffaqiyatsiz kirish urinishlari",
                 '12 ta failed_logins 5 daqiqa ichida, brute-force shubhasi', 0.81),
                ('high', "Honeypot fayliga murojaat qilindi",
                 '"Finance_2024.pdf" honeypot fayli yuklab olindi', 0.85),
                ('high', "Kirish darajasidan yuqori hujjatga murojaat",
                 'DT xodimi secret darajali hujjatga 5 marta murojaat qildi', 0.74),
                ('medium', "Xatolik darajasi oshdi",
                 '1 soat ichida 403/401 javoblari 20%+', 0.58),
                ('medium', "Bir nechta IP dan kirish",
                 'Bir foydalanuvchi 3 ta turli IP dan 30 daqiqa ichida kirdi', 0.52),
                ('medium', "Sessiya davomiyligi g'ayrioddiy",
                 'Sessiya 14 soat davom etdi (normal: 1-3 soat)', 0.49),
                ('low', "Admin API ga murojaat qilindi",
                 'DT rahbar admin endpointiga murojaat qildi', 0.42),
                ('low', "Parol tiklash kechikdi",
                 'Reset so\'rovidan so\'ng 72 soat davomida tasdiqlanmadi', 0.38),
                ('low', "Bir xil hujjat ko'p marta ko'rildi",
                 'Bitta hujjat 20+ marta ketma-ket ochildi', 0.36),
                ('critical', "E2E kalit muvaffaqiyatsizliklari",
                 'Bir xil foydalanuvchida 8 ta e2e_key_failures — kompromentatsiya shubhasi', 0.89),
                ('high', "Ommaviy eksport urinishi",
                 '15 daqiqa ichida 50+ hujjat eksport qilindi', 0.76),
                ('medium', "Geo-dislokatsiya anomaliyasi",
                 "10 daqiqa ichida Toshkent va Moskvadan kirish — impossible travel", 0.61),
                ('high', "Ro'yxatdan o'tmagan endpointlarga so'rov",
                 '/api/internal/*/ pathiga ruxsat so\'rovlari', 0.69),
                ('medium', 'Ish vaqtidan tashqari faollik',
                 'Dushanba 02:00-04:00 oralig\'ida odatiy bo\'lmagan faollik', 0.55),
            ]
            admin_user = CustomUser.objects.get(email='admin@scp.local')
            for idx, (sev, title, desc, score) in enumerate(anomaly_samples):
                user_for = random.choice(anomalous_users) if idx < len(anomalous_users) else random.choice(all_users)
                features = {
                    'failed_logins': random.randint(0, 15),
                    'requests_count': random.randint(50, 500),
                    'docs_accessed': random.randint(1, 40),
                    'docs_downloaded': random.randint(1, 60),
                    'hour_of_day': random.choice([2, 3, 22, 23, 14]),
                    'error_rate': round(random.uniform(0.0, 0.35), 2),
                    'unique_endpoints': random.randint(5, 30),
                    'session_duration_min': random.randint(5, 900),
                    'sensitive_docs_accessed': random.randint(0, 12),
                    'distinct_ips': random.randint(1, 5),
                    'share_actions': random.randint(0, 8),
                    'admin_actions': random.randint(0, 5),
                    'password_reset_delay_min': random.randint(0, 4320),
                    'e2e_key_failures': random.randint(0, 8),
                    'repeated_doc_downloads': random.randint(0, 20),
                }
                resolved = idx % 4 == 0
                AnomalyReport.objects.create(
                    title=title, description=desc, severity=sev,
                    user=user_for, anomaly_score=score, features=features,
                    is_resolved=resolved,
                    reviewed_by=admin_user if resolved else None,
                    reviewed_at=now - timedelta(hours=random.randint(1, 48)) if resolved else None,
                    resolved_at=now - timedelta(hours=random.randint(1, 48)) if resolved else None,
                )

        self.stdout.write(self.style.SUCCESS(
            f'[6/9] AnomalyReport total: {AnomalyReport.objects.count()}'))

        # ---- Notifications for each user ----
        for user in all_users:
            for _ in range(random.randint(3, 8)):
                title, msg, t = random.choice(NOTIFICATION_SAMPLES)
                Notification.objects.create(
                    recipient=user, title=title, message=msg,
                    notification_type=t,
                    is_read=random.random() > 0.4,
                )

        self.stdout.write(self.style.SUCCESS(
            f'[7/9] Notifications total: {Notification.objects.count()}'))

        # ---- Audit logs ----
        if AuditLog.objects.count() < 80:
            models_touched = ['Document', 'Organization', 'CustomUser', 'AlertRule', 'HoneypotFile']
            for _ in range(120):
                AuditLog.objects.create(
                    user=random.choice(all_users),
                    action=random.choice(['create', 'read', 'update', 'delete']),
                    model_name=random.choice(models_touched),
                    object_id=str(uuid.uuid4()),
                    changes={'field_x': 'before->after'},
                    ip_address=random.choice(IP_POOL),
                )

        # ---- Alert rules ----
        alert_rules_data = [
            ('Kunlik anomaliya chegarasi', 'anomaly_count', 5, 'notification'),
            ('Muvaffaqiyatsiz kirish chegarasi', 'failed_logins', 5, 'all'),
            ('Xatolik darajasi yuqori', 'error_rate', 0.15, 'email'),
            ('Honeypot ogohlantirishi', 'honeypot_access', 1, 'all'),
        ]
        for name, ct, th, act in alert_rules_data:
            AlertRule.objects.get_or_create(
                name=name,
                defaults={
                    'condition_type': ct, 'threshold': th, 'action': act,
                    'is_active': True, 'created_by': admin_user,
                    'last_triggered_at': now - timedelta(hours=random.randint(1, 48)),
                },
            )

        # ---- Honeypot files ----
        honeypots = [
            ('Finance_2024_SECRET.pdf', 'Moliyaviy hisobot — maxfiy'),
            ('Admin_Passwords.xlsx', 'Administrator parollari ro\'yxati'),
            ('Employee_SSN_List.csv', 'Xodimlar ID va shaxsiy ma\'lumotlari'),
        ]
        for title, desc in honeypots:
            hp, _ = HoneypotFile.objects.get_or_create(
                title=title,
                defaults={
                    'description': desc,
                    'file_path': f'/honeypot/{title}',
                    'created_by': admin_user,
                    'is_active': True,
                    'access_count': random.randint(0, 4),
                    'last_accessed_at': now - timedelta(days=random.randint(1, 15)) if random.random() > 0.5 else None,
                    'last_accessed_by': random.choice(anomalous_users) if random.random() > 0.5 else None,
                },
            )

        self.stdout.write(self.style.SUCCESS('[8/9] Audit, alert rules, honeypots seeded'))

        # ---- LoginAttempts: success + failed bursts ----
        if LoginAttempt.objects.count() < 300:
            login_batches = []
            for user in all_users:
                for _ in range(random.randint(10, 30)):
                    login_batches.append(LoginAttempt(
                        user=user, email=user.email,
                        ip_address=random.choice(IP_POOL),
                        user_agent=random.choice(USER_AGENTS),
                        success=True,
                    ))
            # Failed bursts for anomalous users
            for au in anomalous_users:
                for _ in range(random.randint(8, 20)):
                    login_batches.append(LoginAttempt(
                        user=au, email=au.email,
                        ip_address=random.choice(SUSPICIOUS_IPS),
                        user_agent='python-requests/2.31',
                        success=False,
                    ))
            LoginAttempt.objects.bulk_create(login_batches, batch_size=500)

        # ---- AI Model Config ----
        AIModelConfig.objects.get_or_create(
            name='IsolationForest-default',
            defaults={
                'model_type': 'isolation_forest',
                'parameters': {
                    'n_estimators': 200,
                    'max_samples': 256,
                    'contamination': 0.05,
                    'random_state': 42,
                },
                'is_active': True,
                'model_file_path': 'ml_models/isolation_forest_model.joblib',
                'last_trained_at': now - timedelta(hours=12),
                'training_samples_count': ActivityLog.objects.count(),
                'threshold': -0.5,
            },
        )

        self.stdout.write(self.style.SUCCESS(
            f'[9/9] Login attempts: {LoginAttempt.objects.count()}'))
        self.stdout.write(self.style.SUCCESS('\n=== Demo seed complete ==='))
        self.stdout.write(f'  Users:           {CustomUser.objects.count()}')
        self.stdout.write(f'  Confessions:     {Confession.objects.count()}')
        self.stdout.write(f'  Organizations:   {Organization.objects.count()}')
        self.stdout.write(f'  Documents:       {Document.objects.count()}')
        self.stdout.write(f'  DocShares:       {DocumentShare.objects.count()}')
        self.stdout.write(f'  AccessLogs:      {DocumentAccessLog.objects.count()}')
        self.stdout.write(f'  ActivityLogs:    {ActivityLog.objects.count()}')
        self.stdout.write(f'  AnomalyReports:  {AnomalyReport.objects.count()}')
        self.stdout.write(f'  Notifications:   {Notification.objects.count()}')
        self.stdout.write(f'  AuditLogs:       {AuditLog.objects.count()}')
        self.stdout.write(f'  AlertRules:      {AlertRule.objects.count()}')
        self.stdout.write(f'  HoneypotFiles:   {HoneypotFile.objects.count()}')
        self.stdout.write(f'  LoginAttempts:   {LoginAttempt.objects.count()}')
