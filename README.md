# Secure Confession Platform

Diniy konfessiyalar uchun xavfsiz ma'lumotlar almashish platformasi — sun'iy intellekt (Isolation Forest) asosida anomaliya aniqlash tizimi bilan.

## Texnologiyalar

- **Backend:** Django 4.2, Django REST Framework, PostgreSQL 15, Celery + Redis
- **Frontend:** React 18, Redux Toolkit, Tailwind CSS, Vite, Recharts
- **AI:** scikit-learn (Isolation Forest), numpy, joblib
- **Infrastructure:** Docker Compose (7 services), Nginx, Gunicorn

## Tez boshlash

```bash
# 1. Reponi klonlash
git clone <repo-url>
cd secure-confession-platform

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

## Rollar

| Rol | Tavsif |
|-----|--------|
| Super Admin | Tizim boshqaruvi, barcha ruxsatlar |
| Qo'mita Rahbari | Konfessiyalar nazorati |
| Konfessiya Rahbari | O'z tashkiloti ma'lumotlari |
| A'zo (Member) | Oddiy foydalanuvchi |
| Security Auditor | Xavfsizlik tekshiruvi, audit loglar |
| Psixolog | Konfessiyalarni o'qish (faqat) |
| IT Admin | Texnik sozlamalar, AI konfiguratsiya |

## Testlar

```bash
docker compose exec backend python manage.py test --verbosity=2
```

## Loyiha strukturasi

Batafsil loyiha strukturasini `PROJECT_STRUCTURE.txt` da ko'ring.

## Hujjatlar

- [API Documentation](docs/API_DOCUMENTATION.md)
- [O'rnatish yo'riqnomasi](docs/INSTALL.md)
- [Foydalanuvchi qo'llanmasi](docs/USER_GUIDE.md)
