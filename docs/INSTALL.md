# O'rnatish yo'riqnomasi

## Talablar

- Docker va Docker Compose
- Git

Yoki lokal ishga tushirish uchun:
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

## Docker bilan o'rnatish (tavsiya etiladi)

### 1. Reponi klonlash
```bash
git clone <repo-url>
cd secure-confession-platform
```

### 2. Muhit o'zgaruvchilarini sozlash
```bash
cp .env.example .env
# .env faylini tahrrirlang va quyidagilarni o'zgartiring:
# SECRET_KEY - Django maxfiy kalit (uzun tasodifiy satr)
# DB_PASSWORD - PostgreSQL parol
# TELEGRAM_BOT_TOKEN - (ixtiyoriy) Telegram bot token
# TELEGRAM_DEFAULT_CHAT_ID - (ixtiyoriy) Telegram chat ID
```

### 3. Xizmatlarni ishga tushirish
```bash
docker compose up --build -d
```

Bu quyidagi xizmatlarni ishga tushiradi:
- PostgreSQL (port 5433)
- Redis (port 6380)
- Django Backend (port 8000)
- Celery Worker
- Celery Beat (periodic tasks)
- React Frontend (port 5173)
- Nginx (port 80)

### 4. Ma'lumotlar bazasini tayyorlash
```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_roles
docker compose exec backend python manage.py seed_data
```

### 5. Tekshirish
```bash
# Testlarni ishga tushirish
docker compose exec backend python manage.py test

# Frontend build tekshiruvi
docker compose exec frontend npx vite build
```

### 6. Foydalanish
Brauzerda `http://localhost` oching.

Test foydalanuvchilar:
| Email | Parol | Rol |
|-------|-------|-----|
| admin@scp.local | AdminPass123!@# | Super Admin |
| qomita@scp.local | QomitaPass123!@# | Qo'mita Rahbari |
| leader@scp.local | LeaderPass123!@# | Confession Leader |
| member@scp.local | MemberPass123!@# | Member |
| auditor@scp.local | AuditorPass123!@# | Security Auditor |
| psychologist@scp.local | PsychPass123!@# | Psychologist |
| itadmin@scp.local | ITAdminPass123!@# | IT Admin |

## Lokal ishga tushirish (Dockersiz)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_roles
python manage.py seed_data
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Celery
```bash
cd backend
celery -A config worker -l info
celery -A config beat -l info
```

## Xatoliklarni bartaraf etish

- **Port band:** `docker compose down` va qayta ishga tushiring
- **Migratsiya xatosi:** `docker compose exec backend python manage.py migrate --run-syncdb`
- **Redis ulanish:** Redis xizmati ishlayotganini tekshiring
