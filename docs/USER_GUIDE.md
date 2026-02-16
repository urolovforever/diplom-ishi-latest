# Foydalanuvchi qo'llanmasi

## 1. Tizimga kirish

1. Brauzerda `http://localhost` oching
2. Email va parolingizni kiriting
3. 2FA kodni kiriting (Google Authenticator)

### Parol siyosati
- Kamida 12 belgi, katta/kichik harf, raqam va maxsus belgi
- Har 90 kunda parolni o'zgartirish talab qilinadi
- Oxirgi 5 ta parolni qayta ishlatish mumkin emas
- 5 marta noto'g'ri kiritilganda akkaunt 30 daqiqaga bloklanadi

## 2. Dashboard

Bosh sahifada umumiy statistika ko'rsatiladi:
- Konfessiyalar soni
- Hujjatlar soni
- O'qilmagan bildirishnomalar
- Tashkilotlar soni
- Status bo'yicha konfessiyalar taqsimoti

## 3. Konfessiyalar

### Yangi konfessiya yaratish
1. "Confessions" sahifasiga o'ting
2. "Create Confession" tugmasini bosing
3. Tashkilotni tanlang, sarlavha va matnni kiriting
4. "Save Draft" yoki "Submit" tugmasini bosing

### Status o'zgarishlari
- **Draft** -> **Submitted** (muallif tomonidan)
- **Submitted** -> **Under Review** (rahbar tomonidan)
- **Under Review** -> **Approved** / **Rejected** (rahbar tomonidan)

## 4. Hujjatlar

### Hujjat yuklash
1. "Documents" sahifasiga o'ting
2. "Upload Document" tugmasini bosing
3. Fayl tanlang (PDF, DOCX, XLSX, JPG, PNG — max 50MB)
4. Xavfsizlik darajasi va toifani belgilang

### Xavfsizlik darajalari
- **Public** — hamma ko'rishi mumkin
- **Internal** — faqat ichki foydalanuvchilar
- **Confidential** — faqat ruxsat etilgan xodimlar (yuklab olishda tasdiqlash kerak)
- **Secret** — faqat rahbarlar (yuklab olishda tasdiqlash kerak)

### Versiyalar
- Har bir o'zgartirish yangi versiya sifatida saqlanadi
- "Versions" tugmasi bilan versiyalar tarixini ko'ring

## 5. AI Security Dashboard

(Admin, Security Auditor, IT Admin uchun)

- **Anomaliyalar soni** — aniqlangan anomaliyalar
- **Unreviewed** — ko'rib chiqilmagan
- **Model Status** — AI model holati
- **Scan Now** — qo'lda tekshirish

### Anomaliya ko'rib chiqish
- "Resolve" — anomaliya hal qilindi
- "False +" — noto'g'ri ogohlantirish

## 6. Hisobotlar

(Admin, Security Auditor, Qo'mita Rahbari uchun)

### Hisobot yaratish
1. "Reports" sahifasiga o'ting
2. Hisobot turini tanlang: Activity, Security, Confession
3. "Generate" tugmasini bosing
4. PDF yuklab olish uchun "Download" tugmasini bosing

## 7. Audit Log

(Admin, Security Auditor uchun)

- Barcha CRUD harakatlarning logi
- Filtrlar: harakat turi, model nomi
- CSV eksport

## 8. Sozlamalar

(Admin, IT Admin uchun)

- **Telegram:** Bot token va chat ID sozlash
- **Alert Rules:** Ogohlantirish qoidalari (anomaly count, failed logins, error rate)
- **AI Configuration:** Model parametrlari

## 9. Bildirishnomalar

- Tizim ichki bildirishnomalar yuboradi
- Muhim hodisalar haqida Telegram orqali xabar
- "Mark all read" — barcha o'qilgan deb belgilash

## 10. Profil

- Ism, familiya, email o'zgartirish
- Parolni o'zgartirish
- 2FA holatini ko'rish
