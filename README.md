# Emanat — Xavfsiz Hujjat Boshqaruv Platformasi

Diniy konfessiyalar va tashkilotlar uchun xavfsiz hujjatlar almashish platformasi — sun'iy intellekt (Isolation Forest) asosida anomaliya aniqlash tizimi bilan.

**Production:** [https://emanat.systems](https://emanat.systems)

## Texnologiyalar

- **Backend:** Django 4.2, Django REST Framework, PostgreSQL 15, Celery + Redis
- **Frontend:** React 18, Redux Toolkit, Tailwind CSS, Vite, Recharts
- **AI/ML:** scikit-learn (Isolation Forest), NumPy, joblib — 15 ta xulq-atvor ko'rsatkichlari asosida anomaliya aniqlash
- **Infratuzilma:** Docker Compose (8 servis), Nginx, Gunicorn, Let's Encrypt SSL

## Asosiy imkoniyatlar

- **Rolga asoslangan kirish nazorati (RBAC)** — 7 ta rol, ierarxik ruxsatlar
- **Hujjat shifrlash** — fayl darajasida shifrlash, E2E encryption
- **AI anomaliya aniqlash** — Isolation Forest modeli, real-time monitoring
- **Ikki bosqichli autentifikatsiya (2FA)** — TOTP asosida
- **Audit logging** — barcha foydalanuvchi harakatlari kuzatiladi
- **Honeypot fayllar** — ruxsatsiz kirishni aniqlash
- **Hujjat versiyalash** — o'zgarishlar tarixi saqlanadi
- **Bildirishnomalar** — email va Telegram integratsiya

## Tez boshlash

```bash
# 1. Reponi klonlash
git clone git@github.com:urolovforever/diplom-ishi-latest.git
cd diplom-ishi-latest

# 2. .env faylini yaratish
cp .env.example .env

# 3. Docker bilan ishga tushirish
docker compose up --build -d

# 4. Migratsiyalar va boshlang'ich ma'lumotlar
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_roles
docker compose exec backend python manage.py seed_data

# 5. Brauzerda ochish
# http://localhost
```

## Production deploy

```bash
# Serverga deploy qilish (emanat.systems)
ssh emanat "bash /opt/emanat/deploy.sh"
```

## Rollar

| Rol | Tavsif |
|-----|--------|
| Super Admin | Tizim boshqaruvi, barcha ruxsatlar |
| Konfessiya Rahbari | Konfessiyalar nazorati |
| Konfessiya Xodimi | Konfessiya bo'yicha xodim |
| DT Rahbar | Diniy tashkilot rahbari |
| DT Xodimi | Diniy tashkilot xodimi |
| Security Auditor | Xavfsizlik tekshiruvi, audit loglar |
| Psixolog | Konfessiyalarni o'qish (faqat) |

## API endpointlar

| Endpoint | Tavsif |
|----------|--------|
| `/api/accounts/` | Foydalanuvchilar, autentifikatsiya, rollar |
| `/api/confessions/` | Konfessiya va tashkilotlar |
| `/api/documents/` | Hujjatlar CRUD, ulashish, kirish loglari |
| `/api/notifications/` | Bildirishnomalar va ogohlantirishlar |
| `/api/ai-security/` | AI anomaliya, faoliyat loglari |
| `/api/audit/` | Audit loglar va hisobotlar |

## Testlar

```bash
docker compose exec backend python manage.py test --verbosity=2
```

## Loyiha strukturasi

```
├── backend/          # Django API
├── frontend/         # React SPA
├── ai_module/        # AI model training
├── docker/           # Nginx, PostgreSQL konfiguratsiyalari
├── docker-compose.yml        # Development
└── docker-compose.prod.yml   # Production
```
