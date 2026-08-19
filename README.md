# Emanat — Secure Document Management Platform

Graduation thesis project (Computer Engineering, International Islamic Academy of Uzbekistan).

Emanat is a secure document exchange platform for religious confessions and organizations in Uzbekistan. Organizations of this kind routinely exchange registration papers, reports and confidential documents by e-mail or messenger, with no access control or audit trail. Emanat replaces that with a single platform where every document is encrypted, every access is logged, and unusual user behavior is detected automatically by a machine-learning model.

O'zbekcha to'liq hujjat: [README.uz.md](README.uz.md)

**Live demo:** currently offline (the pilot server was decommissioned; deployment kit included).
**Screenshots:** _to be added_

## What it does

- **Role-based access control** — 5 hierarchical roles, from super admin down to organization staff; each role sees only its own confession/organization.
- **Document security** — server-side AES-256-CBC encryption for all files, plus optional end-to-end encryption (RSA-4096 + AES-256-GCM via the Web Crypto API, keys never leave the browser). Security levels from public to secret, document versioning with rollback, per-document access logs.
- **AI anomaly detection** — an Isolation Forest model scores user behavior every 15 minutes over 15 features (failed logins, download bursts, unusual hours, honeypot access, etc.). Suspicious sessions trigger alerts; high-risk sessions are blocked automatically. The model retrains daily on recent activity.
- **Hardened authentication** — TOTP two-factor auth, single active session, account lockout, 12-char/90-day password policy, IP allow/deny lists, rate limiting.
- **Audit and reporting** — every CRUD operation logged with user, IP and JSON diff; CSV export and generated PDF reports; daily encrypted database backups.
- **Notifications** — in-app, e-mail and Telegram alerts with configurable rules.

## Architecture

Eight Docker Compose services: Django REST API, React SPA (served by nginx), PostgreSQL, Redis, Celery worker + beat (background scanning, model retraining, backups), MailHog (dev) / Resend (prod).

| Layer | Stack |
|---|---|
| Backend | Django 4.2, Django REST Framework, PostgreSQL 15, Celery 5 + Redis 7 |
| Frontend | React 18, Redux Toolkit, Tailwind CSS, Vite, Recharts |
| ML | scikit-learn (Isolation Forest), NumPy, joblib |
| Crypto | AES-256-CBC (server), RSA-4096 + AES-256-GCM (E2E, Web Crypto API) |
| Infrastructure | Docker Compose, nginx, Gunicorn, Let's Encrypt |

The full API reference, page map, Celery schedule and middleware chain are documented in [README.uz.md](README.uz.md).

## Running locally

```bash
git clone https://github.com/urolovforever/diplom-ishi-latest.git
cd diplom-ishi-latest
cp .env.example .env

docker compose up --build -d
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_roles
docker compose exec backend python manage.py seed_data

# Frontend: http://localhost:5174   API: http://localhost:8000/api/   MailHog: http://localhost:8025
```

Run tests:

```bash
docker compose exec backend python manage.py test
docker compose exec frontend npm run test
```

Train the ML model from scratch (synthetic dataset of 3,000 records with 8 anomaly types):

```bash
cd ai_module
python step1_dataset_generator.py
python step2_ai_model.py
```

## License

MIT — see [LICENSE](LICENSE).
