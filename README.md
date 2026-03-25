# Emanat — Xavfsiz Hujjat Boshqaruv Platformasi

Diniy konfessiyalar va tashkilotlar uchun xavfsiz hujjatlar almashish platformasi — sun'iy intellekt (Isolation Forest) asosida anomaliya aniqlash tizimi bilan.

**Production:** [https://emanat.systems](https://emanat.systems)

---

## Texnologiyalar

| Qatlam | Texnologiyalar |
|--------|---------------|
| **Backend** | Django 4.2, Django REST Framework 3.15, PostgreSQL 15, Celery 5.4 + Redis 7 |
| **Frontend** | React 18, Redux Toolkit, Tailwind CSS 3, Vite 5, Recharts |
| **AI/ML** | scikit-learn (Isolation Forest), NumPy, joblib — 15 ta xulq-atvor xususiyatlari |
| **Shifrlash** | AES-256-CBC (server), RSA-4096 + AES-256-GCM (E2E, Web Crypto API) |
| **Infratuzilma** | Docker Compose (8 servis), Nginx, Gunicorn, Let's Encrypt SSL, Resend (email) |

---

## Asosiy imkoniyatlar

### Xavfsizlik
- **Rolga asoslangan kirish nazorati (RBAC)** — 5 ta ierarxik rol
- **Ikki bosqichli autentifikatsiya (2FA)** — TOTP (Google Authenticator) asosida, QR kod bilan sozlash
- **Hujjat shifrlash** — AES-256-CBC bilan server tomonida avtomatik shifrlash
- **End-to-End shifrlash (E2E)** — RSA-4096 + AES-256-GCM, kalitlar IndexedDB da saqlanadi
- **Sessiya boshqaruvi** — faqat 1 ta aktiv sessiya, 30 daqiqa harakatsizlik timeout, email orqali sessiya tugatish
- **Parol siyosati** — minimum 12 belgi, 90 kunlik muddati, oxirgi 5 ta parol takrorlanmaydi
- **Akkaunt qulflash** — 5 ta muvaffaqiyatsiz urinishdan keyin 30 daqiqaga qulflanadi
- **IP cheklash** — whitelist/blacklist tizimi
- **Honeypot fayllar** — soxta fayllar orqali ruxsatsiz kirishni aniqlash
- **Rate limiting** — 30 so'rov/daqiqa (anonim), 60 so'rov/daqiqa (autentifikatsiya qilingan)

### AI anomaliya aniqlash
- **Algoritm:** Isolation Forest (n_estimators=200, max_samples=256, contamination=0.05)
- **15 ta xulq-atvor xususiyatlari:** failed_logins, requests_count, docs_accessed, docs_downloaded, hour_of_day, error_rate, unique_endpoints, session_duration_min, sensitive_docs_accessed, distinct_ips, share_actions, admin_actions, password_reset_delay_min, e2e_key_failures, repeated_doc_downloads
- **Avtomatik skanerlash:** har 15 daqiqada Celery task orqali
- **Javob choralari:** 0.4+ ball = ogohlantirish, 0.7+ ball = sessiyalar bloklanadi va admin xabardor qilinadi
- **Model qayta o'qitish:** kundalik avtomatik, oxirgi 24 soatlik ma'lumotlar asosida
- **Model versiyalash:** oxirgi 5 ta versiya saqlanadi

### Hujjat boshqaruvi
- Fayl yuklash va yuklab olish (avtomatik shifrlash/deshifrlash)
- Xavfsizlik darajalari: public, internal, confidential, secret
- Kategoriyalar: ro'yxatga olish, hisobotlar, normativ, maxfiy
- Tashkilotlar o'rtasida hujjat ulashish
- Hujjat versiyalash va rollback
- Kirish loglari (kim, qachon, qaysi hujjatni ko'rgan)

### Bildirishnomalar
- Tizim ichidagi bildirishnomalar (info, warning, alert, system)
- Email xabarnomalar (Resend API orqali)
- Telegram bot integratsiya
- Moslashtirilgan ogohlantirish qoidalari (anomaly_count, failed_logins, error_rate, honeypot_access)

### Audit va hisobotlar
- Barcha CRUD operatsiyalari kuzatiladi (foydalanuvchi, IP, o'zgarishlar JSON formatida)
- CSV eksport
- PDF hisobotlar generatsiyasi (ReportLab)
- Kundalik shifrlangan ma'lumotlar bazasi zahirasi (AES-256-CBC)

---

## Rollar va ruxsatlar

| Rol | Tavsif | Yaratishi mumkin |
|-----|--------|-----------------|
| **Super Admin** | Tizim boshqaruvi, barcha ruxsatlar, AI dashboard, audit loglar | Barcha rollar |
| **Konfessiya Rahbari** | O'z konfessiyasidagi tashkilotlar va foydalanuvchilarni boshqaradi | Konfessiya Xodimi, DT Rahbar, DT Xodimi |
| **Konfessiya Xodimi** | Konfessiya resurslari bilan ishlaydi | — |
| **DT Rahbar** | Diniy tashkilot rahbari, o'z tashkiloti foydalanuvchilarini boshqaradi | DT Xodimi |
| **DT Xodimi** | Diniy tashkilot xodimi, o'qish ruxsati | — |

---

## Sahifalar

| Sahifa | Ruxsat | Tavsif |
|--------|--------|--------|
| `/login` | Ochiq | Kirish: email/parol, 2FA, sessiya limiti |
| `/` | Barcha | Dashboard: statistika, grafiklar, so'nggi hujjatlar va ogohlantirishlar |
| `/documents` | Barcha | Hujjatlar: yuklash, yuklab olish, ulashish, qidirish, filtrlash |
| `/organizations` | Barcha | Konfessiya va tashkilotlarni boshqarish |
| `/notifications` | Barcha | Bildirishnomalar: o'qish, filtrlash, o'chirish |
| `/profile` | Barcha | Profil tahrirlash |
| `/settings` | Barcha | Parol o'zgartirish, aktiv sessiyalar boshqaruvi |
| `/users` | Super Admin, Konfessiya Rahbari, DT Rahbar | Foydalanuvchilarni boshqarish: taklif qilish, tahrirlash, faollashtirish |
| `/users/:id` | Super Admin, Konfessiya Rahbari, DT Rahbar | Foydalanuvchi tafsilotlari |
| `/admin-panel` | Super Admin | Admin panel: IP cheklash, ogohlantirish qoidalari, Telegram sozlamalari |
| `/ai-dashboard` | Super Admin | AI dashboard: anomaliyalar, model holati, qo'lda skanerlash |
| `/audit-log` | Super Admin | Audit loglar: filtrlash, CSV eksport |
| `/password-reset` | Ochiq | Parolni tiklash so'rovi |
| `/password-reset/confirm` | Ochiq | Yangi parol o'rnatish |

---

## API endpointlar

### Autentifikatsiya va foydalanuvchilar (`/api/accounts/`)

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| POST | `/login/` | Kirish (email + parol) |
| POST | `/verify-2fa/` | 2FA tasdiqlash |
| POST | `/2fa-setup/` | QR kod olish |
| POST | `/logout/` | Chiqish |
| POST | `/token/refresh/` | JWT tokenni yangilash |
| GET/POST | `/users/` | Foydalanuvchilar ro'yxati / yaratish |
| GET/PATCH | `/users/<uuid>/` | Foydalanuvchi tafsiloti / tahrirlash |
| POST | `/change-password/` | Parol o'zgartirish |
| POST | `/password-reset/` | Parolni tiklash so'rovi |
| POST | `/password-reset/confirm/` | Parolni tiklash tasdiqlash |
| GET/PUT | `/profile/` | Profil olish / tahrirlash |
| GET | `/roles/` | Rollar ro'yxati |
| GET | `/sessions/` | Aktiv sessiyalar |
| DELETE | `/sessions/<uuid>/` | Sessiyani tugatish |
| POST | `/sessions/revoke-all/` | Barcha sessiyalarni tugatish |
| POST | `/session-termination/request/` | Sessiya tugatish kodi so'rash |
| POST | `/session-termination/confirm/` | Sessiya tugatish tasdiqlash |
| GET/POST/DELETE | `/ip-restrictions/` | IP cheklashlar |
| GET | `/admin/dashboard/` | Admin statistika |
| POST | `/e2e/keys/` | E2E kalitni yuklash |
| GET | `/e2e/keys/` | O'z E2E kalitlarini olish |
| GET | `/e2e/keys/<uuid>/` | Foydalanuvchining ochiq kaliti |
| GET | `/e2e/recipients/` | E2E qabul qiluvchilar ro'yxati |

### Konfessiya va tashkilotlar (`/api/confessions/`)

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET/POST | `/confessions/` | Konfessiyalar ro'yxati / yaratish |
| GET/PATCH | `/confessions/<uuid>/` | Konfessiya tafsiloti / tahrirlash |
| GET/POST | `/organizations/` | Tashkilotlar ro'yxati / yaratish |
| GET | `/organizations/all/` | Barcha tashkilotlar |
| GET/PATCH | `/organizations/<uuid>/` | Tashkilot tafsiloti / tahrirlash |
| GET | `/stats/dashboard/` | Dashboard statistika |

### Hujjatlar (`/api/documents/`)

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET/POST | `/` | Hujjatlar ro'yxati / yuklash |
| POST | `/mark-read/` | O'qilgan deb belgilash |
| GET/PATCH/DELETE | `/<uuid>/` | Hujjat tafsiloti / tahrirlash / o'chirish |
| POST | `/<uuid>/share/` | Tashkilotga ulashish |
| GET | `/<uuid>/download/` | Yuklab olish (deshifrlash) |
| GET | `/<uuid>/access-logs/` | Hujjat kirish loglari |
| GET | `/access-logs/` | Barcha kirish loglari |
| GET/POST | `/<uuid>/versions/` | Versiyalar / yangi versiya |
| GET | `/<uuid>/versions/diff/` | Versiyalar farqi |
| POST | `/<uuid>/versions/<n>/rollback/` | Versiyaga qaytish |
| GET/POST/DELETE | `/honeypot/` | Honeypot fayllar |
| POST | `/honeypot/<uuid>/access/` | Honeypot kirish (alert trigger) |

### AI xavfsizlik (`/api/ai-security/`)

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/activity-logs/` | Faoliyat loglari |
| GET/POST | `/anomaly-reports/` | Anomaliya hisobotlari |
| GET | `/anomaly-reports/<uuid>/` | Anomaliya tafsiloti |
| POST | `/anomaly-reports/<uuid>/review/` | Anomaliyani ko'rib chiqish |
| GET | `/ai-configs/` | AI model konfiguratsiyalari |
| GET | `/dashboard/` | AI dashboard statistika |
| GET | `/model-status/` | Model holati |
| POST | `/scan/` | Qo'lda skanerlash |
| POST | `/evaluate/` | Model baholash |

### Audit (`/api/audit/`)

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/logs/` | Audit loglar |
| GET | `/logs/export/` | CSV eksport |
| GET/POST | `/reports/` | Hisobotlar / generatsiya |
| GET | `/reports/<uuid>/download/` | PDF yuklab olish |

### Bildirishnomalar (`/api/notifications/`)

| Method | Endpoint | Tavsif |
|--------|----------|--------|
| GET | `/` | Bildirishnomalar ro'yxati |
| POST | `/mark-read/` | O'qilgan deb belgilash |
| GET | `/unread-count/` | O'qilmagan soni |
| GET/POST/PATCH/DELETE | `/alert-configs/` | Ogohlantirish konfiguratsiyalari |
| GET/POST/PATCH/DELETE | `/alert-rules/` | Ogohlantirish qoidalari |
| GET/POST/DELETE | `/telegram-config/` | Telegram sozlamalari |

---

## Celery vazifalar (fon jarayonlari)

| Vazifa | Jadval | Tavsif |
|--------|--------|--------|
| `scan_recent_activity` | Har 15 daqiqada | Foydalanuvchilar xulq-atvorini skanerlash, anomaliyalarni aniqlash |
| `train_isolation_forest` | Kundalik | AI modelni qayta o'qitish |
| `check_alert_thresholds` | Har 5 daqiqada | Ogohlantirish qoidalarini tekshirish |
| `cleanup_old_logs` | Haftalik | 2 yildan eski loglarni o'chirish |
| `daily_encrypted_backup` | Kundalik | Shifrlangan DB zahirasi (oxirgi 30 ta saqlanadi) |
| `cleanup_inactive_invited_users` | Kundalik | 3 kundan oshgan taklif qilingan, kirmagan foydalanuvchilarni o'chirish |
| `cleanup_old_sessions` | Kundalik | 30 kundan eski sessiyalarni o'chirish |

---

## Middleware zanjiri

1. **SecurityMiddleware** — Django xavfsizlik sarlavhalari
2. **SessionMiddleware** — Sessiya boshqaruvi
3. **CorsMiddleware** — CORS siyosati
4. **IPRestrictionMiddleware** — IP whitelist/blacklist tekshiruvi
5. **ActivityLogMiddleware** — Barcha API so'rovlarini logga yozish (50 ta bufer, 10 soniya flush)
6. **SessionTimeoutMiddleware** — 30 daqiqa harakatsizlik timeout
7. **PasswordExpiryMiddleware** — 90 kunlik parol muddati tekshiruvi

---

## Loyiha strukturasi

```
diplom-ishi-latest/
├── backend/                        # Django API
│   ├── accounts/                   # Foydalanuvchilar, rollar, autentifikatsiya
│   │   ├── models.py               # CustomUser, Role, LoginAttempt, UserSession,
│   │   │                           # PasswordResetToken, SessionTerminationCode,
│   │   │                           # IPRestriction, PasswordHistory
│   │   ├── views.py                # Login, 2FA, sessiya, parol, profil API
│   │   ├── serializers.py          # DRF serializerlar
│   │   ├── middleware.py           # IP cheklash, parol muddati
│   │   ├── security.py             # Shifrlash yordamchi funksiyalar
│   │   └── tasks.py                # Fon vazifalari (email, tozalash)
│   ├── documents/                  # Hujjat boshqaruvi
│   │   ├── models.py               # Document, DocumentShare, DocumentVersion,
│   │   │                           # DocumentAccessLog, DocumentEncryptedKey, HoneypotFile
│   │   └── views.py                # Yuklash, yuklab olish, ulashish, versiyalash
│   ├── confessions/                # Konfessiya va tashkilotlar
│   │   └── models.py               # Confession, Organization
│   ├── ai_security/                # AI anomaliya aniqlash
│   │   ├── engine.py               # IsolationForestEngine — o'qitish, bashorat, tushuntirish
│   │   ├── features.py             # 15 ta xususiyat chiqarish
│   │   ├── middleware.py           # Faoliyat loglari, sessiya timeout
│   │   ├── tasks.py                # Skanerlash, o'qitish, tozalash
│   │   └── models.py               # ActivityLog, AnomalyReport, AIModelConfig
│   ├── audit/                      # Audit loglar va hisobotlar
│   │   └── models.py               # AuditLog, Report
│   ├── notifications/              # Bildirishnomalar
│   │   ├── models.py               # Notification, AlertConfig, TelegramConfig, AlertRule
│   │   └── tasks.py                # Email, Telegram, threshold tekshiruvi
│   ├── config/                     # Django sozlamalari
│   │   └── settings/               # base.py, development.py, production.py
│   ├── templates/emails/           # HTML email shablonlari (xush kelibsiz, parol, xabar)
│   ├── ml_models/                  # O'qitilgan ML modellar (joblib)
│   └── requirements.txt            # Python kutubxonalar
├── frontend/                       # React SPA
│   ├── src/
│   │   ├── pages/                  # 15 ta sahifa
│   │   ├── components/             # UI, auth, layout, ai, dashboard komponentlar
│   │   ├── store/                  # Redux: auth, documents, confessions, ai, notifications, crypto, ui
│   │   ├── api/                    # Axios: auth, documents, confessions, ai, notifications, crypto
│   │   ├── hooks/                  # useAuth, usePermission
│   │   └── utils/                  # crypto.js (Web Crypto API), validation.js, constants.js
│   └── package.json
├── ai_module/                      # AI model o'qitish
│   ├── step1_dataset_generator.py  # Sintetik dataset generatsiya (3000 yozuv, 8 ta anomaliya turi)
│   ├── step2_ai_model.py           # Isolation Forest o'qitish va baholash
│   └── step3_django_integration.py # Django integratsiya ko'rsatmalar
├── docker/
│   ├── nginx/nginx.conf            # Development nginx konfiguratsiya
│   ├── nginx/nginx.prod.conf       # Production nginx (SSL, xavfsizlik sarlavhalari)
│   └── postgres/init.sql           # PostgreSQL boshlang'ich skript
├── docker-compose.yml              # Development (8 servis)
├── docker-compose.prod.yml         # Production (8 servis + certbot)
├── deploy.sh                       # Avtomatik deploy skripti
├── .env.example                    # Development environment namunasi
└── .env.production                 # Production environment namunasi
```

---

## Tez boshlash (Development)

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
# Frontend: http://localhost:5174
# API: http://localhost:8000/api/
# Nginx: http://localhost:8080
# MailHog: http://localhost:8025
```

## Production deploy

```bash
# Serverga deploy qilish (emanat.systems)
ssh emanat "bash /opt/emanat/deploy.sh"

# yoki qo'lda
ssh emanat "cd /opt/emanat && git pull origin main && docker compose -f docker-compose.prod.yml up -d --build"
```

## Testlar

```bash
# Backend testlar
docker compose exec backend python manage.py test --verbosity=2

# Frontend testlar
docker compose exec frontend npm run test
```

## AI model o'qitish

```bash
cd ai_module

# 1-qadam: Dataset generatsiya (3000 yozuv)
python step1_dataset_generator.py

# 2-qadam: Model o'qitish va baholash
python step2_ai_model.py

# Natija: backend/ml_models/ ga saqlangan model fayllar
```

---

## Texnik xususiyatlar

| Parametr | Qiymat |
|----------|--------|
| JWT access token muddati | 15 daqiqa |
| JWT refresh token muddati | 7 kun |
| Maksimal aktiv sessiyalar | 1 |
| Sessiya harakatsizlik timeout | 30 daqiqa |
| Parol minimum uzunligi | 12 belgi |
| Parol muddati | 90 kun |
| Parol tarix limiti | 5 ta |
| Akkaunt qulflash chegarasi | 5 ta muvaffaqiyatsiz urinish |
| Akkaunt qulflash muddati | 30 daqiqa |
| AI skanerlash oraligi | 15 daqiqa |
| AI model qayta o'qitish | Kundalik |
| Anomaliya ogohlantirish chegarasi | 0.4 ball |
| Anomaliya kritik chegarasi | 0.7 ball |
| Faoliyat loglari saqlash muddati | 2 yil |
| DB zahira saqlash | Oxirgi 30 ta |
| Rate limit (anonim) | 30 so'rov/daqiqa |
| Rate limit (autentifikatsiya) | 60 so'rov/daqiqa |
