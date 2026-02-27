# Secure Confession Platform — Proyekt Qo'llanmasi

## Mundarija

1. [Proyekt haqida](#1-proyekt-haqida)
2. [Arxitektura](#2-arxitektura)
3. [Rollar va ruxsatnomalar](#3-rollar-va-ruxsatnomalar)
4. [Tashkilot ierarxiyasi](#4-tashkilot-ierarxiyasi)
5. [Backend modullar](#5-backend-modullar)
6. [API endpointlar](#6-api-endpointlar)
7. [Frontend sahifalar](#7-frontend-sahifalar)
8. [E2E shifrlash](#8-e2e-shifrlash)
9. [AI xavfsizlik tizimi](#9-ai-xavfsizlik-tizimi)
10. [Ishga tushirish](#10-ishga-tushirish)

---

## 1. Proyekt haqida

**Secure Confession Platform** — diniy tashkilotlar faoliyatini boshqarish uchun mo'ljallangan xavfsiz veb-platforma. Tizim hujjatlarni end-to-end shifrlash bilan saqlash, rolga asoslangan kirish nazorati (RBAC), sun'iy intellekt orqali anomaliyalarni aniqlash va to'liq audit trail imkoniyatlarini taqdim etadi.

**Asosiy imkoniyatlar:**
- JWT autentifikatsiya + 2FA (TOTP va SMS)
- RSA-4096 + AES-256-GCM asosidagi E2E shifrlash
- 7 ta rol bilan ierarxik kirish nazorati
- 3 darajali tashkilot ierarxiyasi (Qo'mita → Konfessiya → Diniy Tashkilot)
- Isolation Forest algoritmi bilan anomaliyalarni aniqlash
- Hujjat versiyalash, ulashish va honeypot tuzaqlar
- Telegram orqali ogohlantirish tizimi
- PDF hisobotlar va CSV eksport

**Texnologiyalar:**
- **Backend:** Django 5 + Django REST Framework + Celery + Redis
- **Frontend:** React 18 + Redux Toolkit + Tailwind CSS + Vite
- **Ma'lumotlar bazasi:** PostgreSQL 15
- **Shifrlash:** Web Crypto API (frontend), PyCryptodome (backend)
- **AI:** scikit-learn (Isolation Forest)
- **Infratuzilma:** Docker Compose + Nginx

---

## 2. Arxitektura

### 2.1 Docker servislari

| Servis | Image | Port | Vazifasi |
|--------|-------|------|----------|
| **postgres** | postgres:15-alpine | 5433 | Ma'lumotlar bazasi |
| **redis** | redis:7-alpine | 6380 | Kesh va Celery broker |
| **backend** | Django app | 8000 | REST API server |
| **celery_worker** | Django app | — | Asinxron vazifalar |
| **celery_beat** | Django app | — | Rejali vazifalar (cron) |
| **mailhog** | MailHog | 1025, 8025 | Email test serveri |
| **frontend** | React/Vite | 5174 | SPA frontend |
| **nginx** | Nginx | 80 | Reverse proxy |

### 2.2 Arxitektura diagrammasi

```
┌──────────────┐
│   Browser     │
└──────┬───────┘
       │ :80
┌──────▼───────┐
│    Nginx      │  ← Reverse proxy
└──┬────────┬──┘
   │        │
   │ /api   │ /
   ▼        ▼
┌──────┐ ┌──────────┐
│Django│ │ React/   │
│ DRF  │ │ Vite     │
│:8000 │ │ :5174    │
└──┬───┘ └──────────┘
   │
   ├──► PostgreSQL :5432
   ├──► Redis :6379
   └──► Celery Worker / Beat
```

### 2.3 Muhit o'zgaruvchilari

| O'zgaruvchi | Qiymati | Tavsifi |
|-------------|---------|---------|
| `DJANGO_SETTINGS_MODULE` | `config.settings.development` | Django sozlamalari |
| `DB_HOST` | `postgres` | DB host |
| `DB_PORT` | `5432` | DB port |
| `DB_NAME` | `confession_db` | DB nomi |
| `DB_USER` | `confession_user` | DB foydalanuvchi |
| `DB_PASSWORD` | `confession_pass` | DB parol |
| `REDIS_URL` | `redis://redis:6379/0` | Redis manzil |
| `SECRET_KEY` | `...` | Django maxfiy kalit |
| `VITE_API_URL` | `http://localhost/api` | Frontend API URL |

### 2.4 Middleware zanjiri

1. `SecurityMiddleware` — HTTPS va xavfsizlik headerlari
2. `SessionMiddleware` — Django sessiyalar
3. `CORSMiddleware` — Cross-origin so'rovlar
4. `CommonMiddleware` — Umumiy HTTP muomala
5. `CsrfViewMiddleware` — CSRF himoyasi
6. `AuthenticationMiddleware` — Foydalanuvchi autentifikatsiyasi
7. `MessageMiddleware` — Flash xabarlar
8. `XFrameOptionsMiddleware` — Clickjacking himoyasi
9. **`IPRestrictionMiddleware`** — IP oq/qora ro'yxat tekshiruvi
10. **`ActivityLogMiddleware`** — Har bir so'rovni qayd qilish
11. **`SessionTimeoutMiddleware`** — Sessiya muddati nazorati
12. **`PasswordExpiryMiddleware`** — Parol muddati tekshiruvi

---

## 3. Rollar va ruxsatnomalar

### 3.1 Rollar ro'yxati (7 ta)

| # | Rol nomi | Kod | Tashkilot turi |
|---|----------|-----|----------------|
| 1 | Super Admin | `super_admin` | Barcha |
| 2 | Qo'mita Rahbari | `qomita_rahbar` | Qo'mita |
| 3 | Qo'mita Xodimi | `qomita_xodimi` | Qo'mita |
| 4 | Konfessiya Rahbari | `konfessiya_rahbari` | Konfessiya |
| 5 | Konfessiya Xodimi | `konfessiya_xodimi` | Konfessiya |
| 6 | DT Rahbari | `dt_rahbar` | Diniy Tashkilot |
| 7 | DT Xodimi | `dt_xodimi` | Diniy Tashkilot |

### 3.2 Rol yaratish ierarxiyasi

Har bir rahbar faqat o'zidan pastdagi rollarni yaratishi mumkin:

| Rol | Yarataishi mumkin bo'lgan rollar |
|-----|----------------------------------|
| `super_admin` | Barcha 7 ta rol |
| `qomita_rahbar` | qomita_xodimi, konfessiya_rahbari, konfessiya_xodimi, dt_xodimi |
| `konfessiya_rahbari` | konfessiya_xodimi, dt_rahbar, dt_xodimi |
| `dt_rahbar` | dt_xodimi |
| Boshqa rollar | Hech kim |

### 3.3 Hujjat xavfsizlik darajasi bo'yicha kirish

| Rol | Maksimal daraja | Kirish mumkin |
|-----|-----------------|---------------|
| `super_admin` | `secret` | public, internal, confidential, secret |
| `qomita_rahbar` | `secret` | public, internal, confidential, secret |
| `qomita_xodimi` | `secret` | public, internal, confidential, secret |
| `konfessiya_rahbari` | `confidential` | public, internal, confidential |
| `konfessiya_xodimi` | `confidential` | public, internal, confidential |
| `dt_rahbar` | `internal` | public, internal |
| `dt_xodimi` | `internal` | public, internal |

### 3.4 Frontend sahifalarga kirish

| Sahifa | Ruxsat etilgan rollar |
|--------|----------------------|
| Dashboard | Barcha autentifikatsiyalangan foydalanuvchilar |
| Hujjatlar | Barcha autentifikatsiyalangan foydalanuvchilar |
| Tashkilotlar | super_admin, qomita_rahbar, konfessiya_rahbari, dt_rahbar |
| Foydalanuvchilar | super_admin, qomita_rahbar, konfessiya_rahbari, dt_rahbar |
| AI Dashboard | super_admin, qomita_rahbar, qomita_xodimi |
| Hisobotlar | super_admin, qomita_rahbar, qomita_xodimi |
| Audit log | super_admin, qomita_rahbar |
| Sozlamalar | super_admin, qomita_xodimi |

---

## 4. Tashkilot ierarxiyasi

### 3 darajali daraxt tuzilishi

```
Qo'mita (ildiz — parentsiz)
├── Konfessiya A (parent = Qo'mita)
│   ├── Diniy Tashkilot 1 (parent = Konfessiya A)
│   └── Diniy Tashkilot 2 (parent = Konfessiya A)
└── Konfessiya B (parent = Qo'mita)
    └── Diniy Tashkilot 3 (parent = Konfessiya B)
```

### Validatsiya qoidalari

| Tashkilot turi | Parent talabi |
|----------------|---------------|
| `qomita` | Parent bo'lishi **mumkin emas** |
| `konfessiya` | Parent **albatta** `qomita` bo'lishi kerak |
| `diniy_tashkilot` | Parent **albatta** `konfessiya` bo'lishi kerak |

### Organization modeli

| Maydon | Turi | Tavsifi |
|--------|------|---------|
| `id` | UUID | Birlamchi kalit |
| `name` | varchar(255) | Tashkilot nomi |
| `description` | text | Tavsifi |
| `org_type` | choice | `qomita`, `konfessiya`, `diniy_tashkilot` |
| `parent` | FK → Organization | Yuqori tashkilot (nullable) |
| `leader` | FK → CustomUser | Tashkilot rahbari (nullable) |
| `is_active` | boolean | Faolligi |

---

## 5. Backend modullar

### 5.1 accounts — Foydalanuvchilar va autentifikatsiya

**Modellar:**

| Model | Vazifasi |
|-------|----------|
| `CustomUser` | Foydalanuvchi (UUID, email, rol, 2FA, E2E kalitlar) |
| `Role` | 7 ta rol (super_admin, qomita_rahbar, ...) |
| `PasswordHistory` | Oxirgi 5 ta parol (qayta ishlatishni oldini olish) |
| `LoginAttempt` | Kirish urinishlari logi (IP, user-agent, muvaffaqiyat) |
| `UserSession` | Faol sessiyalar (refresh token, IP, muddati) |
| `PasswordResetToken` | Parolni tiklash tokeni (1 soat amal qiladi) |
| `IPRestriction` | IP oq/qora ro'yxat |

**Autentifikatsiya mexanizmlari:**
- **JWT:** Access token (15 daqiqa) + Refresh token (7 kun), rotatsiya bilan
- **2FA:** TOTP (Google Authenticator) yoki SMS
- **Parol siyosati:** Kamida 12 belgi, katta/kichik harf, raqam, maxsus belgi
- **Parol muddati:** 90 kundan keyin almashtirishga majburlash
- **Akkaunt qulflash:** Noto'g'ri urinishlardan keyin vaqtincha qulflanadi
- **Parol tarixi:** Oxirgi 5 ta parolni qayta ishlatish mumkin emas

### 5.2 confessions — Tashkilotlar

**Modellar:**

| Model | Vazifasi |
|-------|----------|
| `Organization` | Tashkilot (nom, tur, parent, rahbar) |

**Imkoniyatlar:**
- 3 darajali ierarxik tashkilot boshqaruvi (CRUD)
- Dashboard statistikasi (hujjatlar, bildirishnomalar, foydalanuvchilar, anomaliyalar soni)
- Rolga asoslangan filtrlash (har bir foydalanuvchi faqat o'z tashkilotlarini ko'radi)

### 5.3 documents — Hujjatlar boshqaruvi

**Modellar:**

| Model | Vazifasi |
|-------|----------|
| `Document` | Hujjat (fayl, shifrlash, xavfsizlik darajasi, kategoriya) |
| `DocumentShare` | Hujjatni tashkilot bilan ulashish |
| `DocumentEncryptedKey` | E2E shifrlangan simmetrik kalit (har bir qabul qiluvchi uchun) |
| `DocumentVersion` | Hujjat versiyalari |
| `DocumentAccessLog` | Kirish logi (ko'rish, yuklab olish, tahrirlash) |
| `HoneypotFile` | Tuzaq fayl (ruxsatsiz kirishni aniqlash uchun) |

**Xavfsizlik darajalari:** `public`, `internal`, `confidential`, `secret`

**Kategoriyalar:** `registration` (ro'yxatga olish), `reports` (hisobotlar), `normative` (me'yoriy), `confidential` (maxfiy)

**Hujjat shifrlash:**
- Server tomonda: AES-256-CBC (PBKDF2-HMAC-SHA256 kalit hosil qilish)
- E2E: RSA-4096 + AES-256-GCM (client tomonda)
- IV (initialization vector) har bir hujjat uchun alohida saqlanadi

### 5.4 audit — Audit va hisobotlar

**Modellar:**

| Model | Vazifasi |
|-------|----------|
| `AuditLog` | Tizim audit logi (foydalanuvchi, harakat, model, o'zgarishlar, IP) |
| `Report` | Generatsiya qilingan hisobotlar (PDF) |

**Harakat turlari:** `create`, `read`, `update`, `delete`

**Hisobot turlari:** `activity` (faoliyat), `security` (xavfsizlik), `organization` (tashkilot)

**Eksport:** Audit loglarni CSV formatda yuklab olish (5000 qatorgacha)

### 5.5 ai_security — Sun'iy intellekt xavfsizligi

**Modellar:**

| Model | Vazifasi |
|-------|----------|
| `ActivityLog` | API so'rovlar logi (harakat, resurs, IP, user-agent, status) |
| `AnomalyReport` | Aniqlangan anomaliyalar (darajasi, ball, tekshiruv holati) |
| `AIModelConfig` | AI model sozlamalari (turi, parametrlar, threshold) |

**Imkoniyatlar:**
- Isolation Forest algoritmi bilan foydalanuvchi xatti-harakatlarini tahlil qilish
- 9 ta xulq-atvor xususiyati asosida anomaliya aniqlash
- Anomaliya darajalari: `low`, `medium`, `high`, `critical`
- Model avtomatik qayta o'qitish (har 24 soatda)
- Yolg'on ijobiy (false positive) belgilash
- Qo'lda skanerlash imkoniyati

**Celery rejali vazifalar:**

| Vazifa | Interval | Tavsifi |
|--------|----------|---------|
| `train_isolation_forest` | 24 soat | Modelni qayta o'qitish |
| `scan_recent_activity` | 15 daqiqa | Oxirgi faoliyatni skanerlash |
| `cleanup_old_logs` | 7 kun | Eski loglarni tozalash |
| `check_alert_thresholds` | 5 daqiqa | Ogohlantirish chegaralarini tekshirish |

### 5.6 notifications — Bildirishnomalar

**Modellar:**

| Model | Vazifasi |
|-------|----------|
| `Notification` | Foydalanuvchi bildirishnomalari (turi, o'qilganlik holati) |
| `AlertConfig` | Ogohlantirish sozlamalari |
| `TelegramConfig` | Telegram bot sozlamalari (chat_id, ogohlantirish turlari) |
| `AlertRule` | Ogohlantirish qoidalari (shart, chegara, harakat) |

**Bildirishnoma turlari:** `info`, `warning`, `alert`, `system`

**Ogohlantirish shartlari:** `anomaly_count`, `failed_logins`, `error_rate`, `honeypot_access`

**Ogohlantirish harakatlari:** `email`, `telegram`, `notification`, `all`

---

## 6. API endpointlar

### 6.1 Autentifikatsiya (`/api/accounts/`)

| Metod | Endpoint | Tavsifi |
|-------|----------|---------|
| POST | `/login/` | Email va parol bilan kirish |
| POST | `/verify-2fa/` | 2FA tokenni tasdiqlash |
| POST | `/2fa-setup/` | 2FA uchun QR kod olish |
| POST | `/logout/` | Chiqish (refresh tokenni bekor qilish) |
| POST | `/token/refresh/` | Access tokenni yangilash |
| POST | `/change-password/` | Parolni o'zgartirish |
| POST | `/password-reset/` | Parolni tiklash so'rovi |
| POST | `/password-reset/confirm/` | Parol tiklashni tasdiqlash |
| GET | `/profile/` | Joriy foydalanuvchi profili |
| PUT | `/profile/` | Profilni yangilash |
| GET | `/roles/` | Mavjud rollar ro'yxati |

### 6.2 Foydalanuvchilar (`/api/accounts/`)

| Metod | Endpoint | Tavsifi |
|-------|----------|---------|
| GET | `/users/` | Foydalanuvchilar ro'yxati (rahbarlar uchun) |
| POST | `/users/` | Yangi foydalanuvchi qo'shish (taklif) |
| GET | `/users/<uuid>/` | Foydalanuvchi tafsilotlari |
| PUT/PATCH | `/users/<uuid>/` | Foydalanuvchini yangilash |

### 6.3 E2E shifrlash kalitlari (`/api/accounts/e2e/`)

| Metod | Endpoint | Tavsifi |
|-------|----------|---------|
| POST | `/keys/` | Ochiq kalitni saqlash |
| GET | `/keys/` | O'z kalitlarini olish |
| GET | `/keys/<uuid>/` | Boshqa foydalanuvchi ochiq kalitini olish |
| GET | `/recipients/` | E2E qabul qiluvchilar ro'yxati |

### 6.4 IP cheklovlar (`/api/accounts/`)

| Metod | Endpoint | Tavsifi |
|-------|----------|---------|
| GET | `/ip-restrictions/` | IP cheklovlar ro'yxati |
| POST | `/ip-restrictions/` | Yangi IP cheklov qo'shish |
| DELETE | `/ip-restrictions/<uuid>/` | IP cheklovni o'chirish |

### 6.5 Tashkilotlar (`/api/confessions/`)

| Metod | Endpoint | Tavsifi |
|-------|----------|---------|
| GET | `/organizations/` | Tashkilotlar ro'yxati (rolga qarab filtrlangan) |
| POST | `/organizations/` | Yangi tashkilot yaratish |
| GET | `/organizations/all/` | Barcha faol tashkilotlar |
| GET | `/organizations/<uuid>/` | Tashkilot tafsilotlari |
| PUT/PATCH | `/organizations/<uuid>/` | Tashkilotni yangilash |
| DELETE | `/organizations/<uuid>/` | Tashkilotni o'chirish |
| GET | `/stats/dashboard/` | Dashboard statistikasi |

### 6.6 Hujjatlar (`/api/documents/`)

| Metod | Endpoint | Tavsifi |
|-------|----------|---------|
| GET | `/` | Hujjatlar ro'yxati |
| POST | `/` | Hujjat yuklash |
| GET | `/<uuid>/` | Hujjat tafsilotlari |
| PUT/PATCH | `/<uuid>/` | Hujjatni yangilash |
| DELETE | `/<uuid>/` | Hujjatni o'chirish |
| POST | `/<uuid>/share/` | Hujjatni tashkilot bilan ulashish |
| POST | `/<uuid>/download/` | Hujjatni yuklab olish |

### 6.7 Hujjat versiyalar (`/api/documents/`)

| Metod | Endpoint | Tavsifi |
|-------|----------|---------|
| GET | `/<uuid>/versions/` | Versiyalar ro'yxati |
| POST | `/<uuid>/versions/` | Yangi versiya yaratish |
| POST | `/<uuid>/versions/diff/` | Versiyalar orasidagi farq |
| POST | `/<uuid>/versions/<int>/rollback/` | Oldingi versiyaga qaytarish |

### 6.8 Kirish loglari (`/api/documents/`)

| Metod | Endpoint | Tavsifi |
|-------|----------|---------|
| GET | `/access-logs/` | Barcha kirish loglari |
| GET | `/<uuid>/access-logs/` | Muayyan hujjat loglari |

### 6.9 Honeypot tuzaqlar (`/api/documents/honeypot/`)

| Metod | Endpoint | Tavsifi |
|-------|----------|---------|
| POST | `/` | Tuzaq fayl yaratish |
| GET | `/` | Tuzaq fayllar ro'yxati |
| GET | `/<uuid>/` | Tuzaq fayl tafsilotlari |
| PUT/PATCH | `/<uuid>/` | Tuzaq faylni yangilash |
| DELETE | `/<uuid>/` | Tuzaq faylni o'chirish |
| POST | `/<uuid>/access/` | Tuzaqga kirish qayd qilish |

### 6.10 Audit (`/api/audit/`)

| Metod | Endpoint | Tavsifi |
|-------|----------|---------|
| GET | `/logs/` | Audit loglar ro'yxati |
| GET | `/logs/export/` | CSV formatda eksport (5000 qatorgacha) |
| GET | `/reports/` | Hisobotlar ro'yxati |
| POST | `/reports/` | Yangi hisobot generatsiya qilish |
| GET | `/reports/<uuid>/download/` | Hisobotni PDF yuklab olish |

### 6.11 AI xavfsizlik (`/api/ai-security/`)

| Metod | Endpoint | Tavsifi |
|-------|----------|---------|
| GET | `/activity-logs/` | Faoliyat loglari |
| GET | `/anomaly-reports/` | Anomaliyalar ro'yxati |
| POST | `/anomaly-reports/` | Anomaliya hisoboti yaratish |
| GET | `/anomaly-reports/<uuid>/` | Anomaliya tafsilotlari |
| POST | `/anomaly-reports/<uuid>/review/` | Anomaliyani tekshirish |
| GET | `/ai-configs/` | AI model sozlamalari |
| POST | `/ai-configs/` | AI sozlama yaratish |
| GET | `/dashboard/` | AI dashboard statistikasi |
| GET | `/model-status/` | Model holati |
| POST | `/scan/` | Qo'lda anomaliya skanerlash |
| POST | `/evaluate/` | Model baholash |

### 6.12 Bildirishnomalar (`/api/notifications/`)

| Metod | Endpoint | Tavsifi |
|-------|----------|---------|
| GET | `/` | Bildirishnomalar ro'yxati |
| GET | `/<uuid>/` | Bildirishnoma tafsilotlari |
| DELETE | `/<uuid>/` | Bildirishnomani o'chirish |
| POST | `/mark-read/` | O'qilgan deb belgilash |
| GET | `/unread-count/` | O'qilmagan bildirishnomalar soni |
| GET | `/alert-configs/` | Ogohlantirish sozlamalari |
| POST | `/alert-configs/` | Ogohlantirish sozlamasi yaratish |
| GET | `/alert-rules/` | Ogohlantirish qoidalari |
| POST | `/alert-rules/` | Yangi qoida yaratish |
| GET | `/telegram-config/` | Telegram sozlamalari |

### 6.13 Salomatlik tekshiruvi

| Metod | Endpoint | Tavsifi |
|-------|----------|---------|
| GET | `/api/health/` | Tizim salomatlik tekshiruvi |

---

## 7. Frontend sahifalar

### 7.1 Texnologiyalar

| Kutubxona | Versiya | Vazifasi |
|-----------|---------|----------|
| React | 18.3 | UI freymvork |
| Redux Toolkit | 2.2 | State boshqaruvi |
| React Router | 6.26 | Marshrutlash |
| Axios | 1.7 | HTTP so'rovlar |
| Tailwind CSS | 3.4 | Stillar |
| Recharts | 2.12 | Grafiklar |
| Lucide React | 0.564 | Ikonlar |
| Vite | 5.4 | Build tool |

### 7.2 Sahifalar ro'yxati

| Marshrut | Sahifa | Tavsifi |
|----------|--------|---------|
| `/login` | LoginPage | Kirish formasi (email + parol + 2FA) |
| `/password-reset` | PasswordResetRequestPage | Parolni tiklash so'rovi |
| `/password-reset/confirm` | PasswordResetConfirmPage | Parol tiklashni tasdiqlash |
| `/` | DashboardPage | Bosh sahifa — statistika, grafiklar, oxirgi ogohlantirishlar |
| `/documents` | DocumentsPage | Hujjatlar boshqaruvi (yuklash, shifrlash, versiyalar) |
| `/organizations` | OrganizationsPage | Tashkilotlar ierarxiyasi boshqaruvi |
| `/users` | UserManagementPage | Foydalanuvchilar ro'yxati va yaratish |
| `/users/:id` | UserDetailPage | Foydalanuvchi tafsilotlari |
| `/notifications` | NotificationsPage | Bildirishnomalar |
| `/profile` | ProfilePage | Profil va parol o'zgartirish |
| `/ai-dashboard` | AIDashboardPage | AI anomaliya aniqlash dashboardi |
| `/reports` | ReportsPage | Hisobot generatsiya va yuklab olish |
| `/audit-log` | AuditLogPage | Audit trail va CSV eksport |
| `/settings` | SettingsPage | Telegram va ogohlantirish qoidalari sozlamalari |

### 7.3 State boshqaruvi (Redux slicelar)

| Slice | State | Vazifasi |
|-------|-------|----------|
| `authSlice` | user, token, refreshToken | Autentifikatsiya holati |
| `confessionsSlice` | organizations, stats | Tashkilotlar va dashboard statistikasi |
| `documentsSlice` | list, versions, accessLogs | Hujjatlar boshqaruvi |
| `notificationsSlice` | list, unreadCount | Bildirishnomalar |
| `cryptoSlice` | keyPairGenerated | E2E shifrlash kalitlari holati |
| `aiSlice` | anomalies, stats | AI anomaliya ma'lumotlari |
| `uiSlice` | sidebarOpen, toasts | UI holati |

### 7.4 Hooklar

**`useAuth()`** — Autentifikatsiya holati va rol tekshiruvlari:
```
user, isAuthenticated, isSuperAdmin, isQomitaRahbar, isQomitaXodimi,
isKonfessiyaRahbari, isKonfessiyaXodimi, isDTRahbar, isDTXodimi,
hasRole(...roles)
```

**`usePermission()`** — Ruxsatnoma tekshiruvlari:
```
canManageUsers, canViewAIDashboard, canViewReports, canViewAuditLog,
canManageSettings, canManageOrganizations, canUploadDocuments,
canManageHoneypots, canManageAlertRules, canViewAccessLogs, canReviewAnomalies
```

### 7.5 Himoyalangan marshrutlar

- **ProtectedRoute** — Faqat autentifikatsiyalangan foydalanuvchilar
- **KeySetup** — E2E shifrlash kalitlarini sozlash (birinchi kirish)
- **RoleBasedRoute** — Muayyan rollar uchun cheklangan sahifalar

---

## 8. E2E shifrlash

### 8.1 Umumiy arxitektura

**Gibrid shifrlash:** RSA asimmetrik + AES simmetrik

```
┌─────────────────────────────────────────────────────────────┐
│                    KALIT YARATISH                            │
│                                                             │
│  Foydalanuvchi → Shifrlash paroli → PBKDF2 (100K iteratsiya)│
│                                       ↓                     │
│  Web Crypto API → RSA-4096 kalit juftligi                   │
│                     ├── Ochiq kalit → Serverga yuboriladi    │
│                     └── Maxfiy kalit → AES bilan shifrlanadi │
│                                        → IndexedDB da saqlanadi
│                                        → Serverda zaxira nusxa│
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Hujjat shifrlash jarayoni

```
1. Tasodifiy AES-256 kalit generatsiya qilinadi
2. Tasodifiy 12-bayt IV (initialization vector) yaratiladi
3. Hujjat AES-256-GCM bilan shifrlanadi
4. Har bir qabul qiluvchi uchun:
   └── AES kalit RSA-OAEP (qabul qiluvchi ochiq kaliti) bilan shifrlanadi
5. Serverga yuboriladi:
   ├── Shifrlangan fayl (blob)
   ├── IV (base64)
   └── Shifrlangan kalitlar (JSON massiv)
```

### 8.3 Hujjat deshifrlash jarayoni

```
1. Foydalanuvchi shifrlash parolini kiritadi
2. IndexedDB dan maxfiy kalit yuklanadi va deshifrlanadi
3. DocumentEncryptedKey dan shifrlangan AES kalit olinadi
4. AES kalit RSA-OAEP bilan deshifrlanadi
5. Hujjat AES-256-GCM + IV bilan deshifrlanadi
6. Deshifrlangan fayl yuklab olinadi
```

### 8.4 E2E qabul qiluvchilar

Avtomatik qo'shiladigan qabul qiluvchilar:
- Barcha `super_admin` foydalanuvchilar (ochiq kaliti mavjud)
- Barcha `qomita_rahbar` foydalanuvchilar (ochiq kaliti mavjud)
- Tashkilot rahbari (agar mavjud bo'lsa)
- Joriy foydalanuvchi (muallif)

### 8.5 Kriptografik parametrlar

| Parametr | Qiymat |
|----------|--------|
| RSA kalit uzunligi | 4096 bit |
| RSA algoritm | RSA-OAEP (SHA-256) |
| AES algoritm | AES-256-GCM |
| AES kalit uzunligi | 256 bit |
| IV uzunligi | 12 bayt (96 bit) |
| PBKDF2 iteratsiyalar | 100,000 |
| PBKDF2 xesh | SHA-256 |
| Maxfiy kalit saqlash | IndexedDB (shifrlangan) |

---

## 9. AI xavfsizlik tizimi

### 9.1 Isolation Forest algoritmi

**Model sozlamalari:**
- **Algoritm:** Isolation Forest (scikit-learn)
- **Daraxtlar soni:** 200 (`N_ESTIMATORS`)
- **Ifloslangan ulush:** 0.05 (5% kutilgan anomaliya — `CONTAMINATION`)
- **Anomaliya chegarasi:** -0.5 (`THRESHOLD`)

### 9.2 Xulq-atvor xususiyatlari (9 ta feature)

| # | Xususiyat | Tavsifi |
|---|-----------|---------|
| 1 | `failed_logins` | Muvaffaqiyatsiz kirish urinishlari soni |
| 2 | `docs_accessed` | Kirilgan hujjatlar soni |
| 3 | `session_duration_min` | Sessiya davomiyligi (daqiqalarda) |
| 4 | `day_of_week` | Hafta kuni (0=Dushanba, 6=Yakshanba) |
| 5 | `download_mb` | Yuklab olingan ma'lumot hajmi (MB) |
| 6 | `own_section` | O'z tashkilotidagi faoliyat (1.0 yoki 0.0) |
| 7 | `role` | Rol kodi (1-7) |
| 8 | `confession_type` | Tashkilot turi (kodlangan) |
| 9 | `is_anomaly` | Anomaliya belgisi (0 yoki 1) |

### 9.3 Anomaliya darajalari

| Daraja | Ball oralig'i | Harakat |
|--------|---------------|---------|
| `low` | Chegaraga yaqin | Log yozish |
| `medium` | Chegaradan past | Bildirishnoma yuborish |
| `high` | Ancha past | Ogohlantirish + bildirishnoma |
| `critical` | Juda past | Barcha kanallarga ogohlantirish |

### 9.4 Ogohlantirish qoidalari

| Shart turi | Tavsifi |
|------------|---------|
| `anomaly_count` | Anomaliyalar soni chegaradan oshganda |
| `failed_logins` | Muvaffaqiyatsiz kirishlar soni chegaradan oshganda |
| `error_rate` | Xatolar darajasi chegaradan oshganda |
| `honeypot_access` | Tuzaq faylga kirilganda |

**Harakatlar:** email, telegram, notification (tizim ichida), all (barchasi)

---

## 10. Ishga tushirish

### 10.1 Talablar

- Docker va Docker Compose o'rnatilgan bo'lishi kerak
- Kamida 4 GB bo'sh RAM
- Portlar: 80, 5174, 8000, 8025 (MailHog)

### 10.2 Loyihani ishga tushirish

```bash
# 1. Repozitoriyani klonlash
git clone <repository-url>
cd secure-confession-platform

# 2. Docker konteynerlarini ishga tushirish
docker-compose up -d --build

# 3. Migratsiyalarni bajarish
docker-compose exec backend python manage.py migrate

# 4. Boshlang'ich rollarni yaratish
docker-compose exec backend python manage.py seed_roles

# 5. Test ma'lumotlarini yaratish (ixtiyoriy)
docker-compose exec backend python manage.py seed_data

# 6. Brauzerda ochish
# Frontend: http://localhost (Nginx orqali)
# API: http://localhost/api/
# MailHog: http://localhost:8025
# Django Admin: http://localhost/api/admin/
```

### 10.3 Development rejimida

```bash
# Backend (alohida terminal)
cd backend
pip install -r requirements.txt
python manage.py runserver

# Celery worker (alohida terminal)
cd backend
celery -A config worker -l info

# Celery beat (alohida terminal)
cd backend
celery -A config beat -l info

# Frontend (alohida terminal)
cd frontend
npm install
npm run dev
```

### 10.4 Test foydalanuvchilar (seed_data dan keyin)

| Email | Parol | Rol |
|-------|-------|-----|
| `admin@example.com` | `seed_data` buyrug'ida ko'rsatilgan | Super Admin |

> **Eslatma:** Aniq parollar `seed_data` management buyrug'i ichida belgilangan. Ishlab chiqarish muhitida albatta o'zgartiring.

### 10.5 Parol xeshlash

| Usul | Tartib |
|------|--------|
| BCryptSHA256 (cost=12) | Asosiy |
| PBKDF2SHA256 | Zaxira 1 |
| Argon2 | Zaxira 2 |
| Scrypt | Zaxira 3 |

### 10.6 Rate limiting

| Foydalanuvchi turi | Chegara |
|--------------------|---------|
| Anonim | 30 so'rov/daqiqa |
| Autentifikatsiyalangan | 60 so'rov/daqiqa |

---

> **Ushbu qo'llanma** proyektning joriy holati asosida tuzilgan. Yangi modullar yoki o'zgarishlar kiritilganda qo'llanmani yangilash tavsiya etiladi.
