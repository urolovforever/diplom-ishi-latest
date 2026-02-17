# FRONTEND DIZAYN PROMPTI
# Diniy Konfessiyalar Xavfsiz Ma'lumotlar Almashish Platformasi
# ============================================================

## LOYIHA HAQIDA

Bu O'zbekistondagi 16 ta diniy konfessiya (2313 ta tashkilot), Din ishlari bo'yicha qo'mita, Adliya organlari va Konfessiyalararo kengash o'rtasida xavfsiz ma'lumot almashish platformasi. Platformaning asosiy xususiyati — sun'iy intellekt (Isolation Forest) asosida foydalanuvchilar xulq-atvorini real vaqtda tahlil qilib, ichki va tashqi tahdidlarni avtomatik aniqlash.

Texnologiyalar: React 18+, Tailwind CSS, Redux Toolkit, Recharts (grafik), React Router v6.

---

## DIZAYN KONSEPTSIYASI

### Umumiy uslub
- **Tone:** Professional, ishonchli, davlat darajasidagi platforma ko'rinishi
- **Ranglar sxemasi:**
  - Asosiy (Primary): Ko'k (#1B4F72) — ishonch, xavfsizlik, davlat organlari
  - Ikkilamchi (Secondary): Ochiq ko'k (#2E86C1) — aksent, tugmalar
  - Fon (Background): Juda och kulrang (#F8FAFC) — asosiy fon
  - Sidebar fon: To'q ko'k (#0F172A) — kontrast
  - Muvaffaqiyat (Success): Yashil (#10B981)
  - Ogohlantirish (Warning): Sariq (#F59E0B) 
  - Xavf (Danger): Qizil (#EF4444)
  - Matn: To'q kulrang (#1E293B)
  - Ikkinchi darajali matn: (#64748B)
- **Shrift:** Inter yoki Nunito Sans — zamonaviy, o'qishga qulay
- **Border radius:** 8-12px — yumshoq, zamonaviy
- **Shadow:** Yengil soyalar (shadow-sm, shadow-md) — chuqurlik
- **Spacing:** Keng padding va margin — "yengillik" hissi

### Muhim qoidalar
- Har bir sahifada breadcrumb navigatsiya bo'lsin
- Barcha jadvallar responsive bo'lsin (mobilda horizontal scroll)
- Yuklanish paytida skeleton loader ko'rsatilsin
- Xato holatlarida aniq xabar va qayta urinish tugmasi
- Dark mode SHART EMAS — faqat light mode
- O'zbek tilida interfeys (sarlavhalar, tugmalar, xabarlar)

---

## SAHIFALAR DIZAYNI

### 1. LOGIN SAHIFASI (/login)

**Layout:** Ikki ustunli — chap tomonida platforma logotipi va tavsif (ko'k gradient fon), o'ng tomonida login formasi.

**Komponentlar:**
- Chap panel: Platforma nomi "Xavfsiz Ma'lumotlar Platformasi", qisqa tavsif "Diniy konfessiyalar uchun AI-asosidagi xavfsizlik tizimi", abstrakt qulflash yoki shield ikonkasi
- O'ng panel: 
  - "Tizimga kirish" sarlavhasi
  - Email input (ikonka bilan)
  - Parol input (ko'rsatish/yashirish tugmasi bilan)
  - "Kirish" tugmasi (ko'k, to'liq kenglikda)
  - Parolni unutdingizmi? havolasi

**2FA sahifasi (login muvaffaqiyatli bo'lgandan keyin):**
- 6 xonali kod kiritish (har bir raqam alohida inputda)
- 60 soniya countdown timer
- "Kodni qayta yuborish" havolasi
- Orqaga qaytish tugmasi

---

### 2. ASOSIY LAYOUT (barcha ichki sahifalar uchun)

**Tuzilma:** Sidebar (chap) + Header (yuqori) + Content (markaz)

**Sidebar (260px kenglik, to'q ko'k fon):**
- Yuqorida: Platforma logotipi (oq rangli)
- Navigatsiya elementlari (ikonka + matn):
  - 📊 Boshqaruv paneli (Dashboard)
  - 🕌 Konfessiyalar
  - 📄 Hujjatlar
  - 👥 Foydalanuvchilar (faqat admin/qo'mita uchun ko'rinadi)
  - 🧠 AI Xavfsizlik (faqat admin/qo'mita uchun ko'rinadi)
  - 📋 Hisobotlar
  - 🔔 Bildirishnomalar (o'qilmagan soni badge bilan)
  - 📝 Audit Log (faqat admin uchun)
  - ⚙️ Sozlamalar
- Pastda: Foydalanuvchi avatari, ismi, roli
- Aktiv sahifa highlighted (ochiqroq fon + chap chiziq)

**Header (64px balandlik, oq fon, pastda yengil shadow):**
- Chapda: Breadcrumb (Bosh sahifa > Hujjatlar > Yuklash)
- O'ngda: 
  - Qidirish ikonkasi
  - Bildirishnoma qo'ng'iroqchasi (qizil badge bilan)
  - Foydalanuvchi avatari + ismi (dropdown: Profil, Sozlamalar, Chiqish)

---

### 3. BOSHQARUV PANELI — DASHBOARD (/dashboard)

**Layout:** Grid tizimida kartochkalar va grafik.

**Yuqori qator (4 ta stat kartochka, bir qatorda):**
- "Jami konfessiyalar" — 16 (ko'k ikonka)
- "Faol foydalanuvchilar" — 127 (yashil ikonka)
- "Bugungi hujjatlar" — 34 (ko'k ikonka)  
- "AI ogohlantirshlar" — 3 (qizil ikonka, agar bor bo'lsa pulsating)

Har bir kartochka: oq fon, border-radius 12px, shadow-sm, yuqorida ikonka, katta raqam, pastda "O'tgan haftaga nisbatan +12%" trend.

**O'rta qator (2 ta grafik, 60/40 bo'linish):**
- Chapda: "Haftalik faollik" — Line chart (Recharts), X: kunlar, Y: harakatlar soni. Normal (ko'k) va Anomaliya (qizil) ikki chiziq.
- O'ngda: "Konfessiyalar bo'yicha hujjatlar" — Donut/Pie chart, har bir konfessiya rangi bilan.

**Pastki qator (2 ta jadval, 50/50 bo'linish):**
- Chapda: "Oxirgi yuklangan hujjatlar" jadvali — Nomi, Konfessiya, Yuklagan, Sana, Daraja (badge: Ochiq/Cheklangan/Maxfiy)
- O'ngda: "Oxirgi AI ogohlantirshlar" jadvali — Foydalanuvchi, Xavf balli (progress bar ranglar bilan), Turi, Vaqt, Holat (Hal qilindi/Kutilmoqda)

---

### 4. KONFESSIYALAR SAHIFASI (/confessions)

**Yuqorida:** "Konfessiyalar" sarlavhasi + "Yangi qo'shish" tugmasi (faqat admin uchun)

**Kontent:** Kartochkalar grid (3 ta bir qatorda, responsive)
Har bir kartochka:
- Yuqorida: Konfessiya nomi (bold), turi (badge: Islom, Xristianlik, Yahudiylik...)
- O'rtada: Tashkilotlar soni, A'zolar soni, Hujjatlar soni
- Pastda: Rahbar ismi, "Batafsil" tugmasi
- Chap chekkada rang chizig'i (konfessiya turiga qarab rang)

**Konfessiya tafsilot sahifasi (/confessions/:id):**
- Yuqorida: Konfessiya nomi, turi badge, holati (Faol/Nofaol)
- Tab navigatsiya: Umumiy ma'lumot | Tashkilotlar | Hujjatlar | Xodimlar | Statistika
- Har bir tab o'z kontenti bilan

---

### 5. HUJJATLAR SAHIFASI (/documents)

**Yuqorida:** "Hujjatlar" sarlavhasi + "Yangi yuklash" tugmasi

**Filtr paneli (yuqorida, yig'iladigan):**
- Konfessiya bo'yicha (dropdown)
- Toifa bo'yicha (Ro'yxatga olish, Hisobot, Normativ, Maxfiy)
- Xavfsizlik darajasi (Ochiq, Cheklangan, Maxfiy)
- Sana oralig'i (date picker)
- Qidirish (matn bo'yicha)

**Jadval:**
| Nomi | Toifa | Daraja | Konfessiya | Yuklagan | Sana | Hajm | Amallar |

- Daraja ustunida rangli badge: Ochiq (yashil), Cheklangan (sariq), Maxfiy (qizil)
- Amallar: Ko'rish (ko'z ikonka), Yuklab olish (download ikonka), O'chirish (admin uchun)
- Pagination (pastda)

**Hujjat yuklash modali:**
- Drag & drop zona (nuqtali chegarali, ikonka bilan)
- Yoki "Fayl tanlash" tugmasi
- Hujjat nomi input
- Toifa tanlash (dropdown)
- Xavfsizlik darajasi tanlash (radio button)
- "Yuklash" va "Bekor qilish" tugmalari
- Progress bar (yuklash jarayonida)

---

### 6. AI XAVFSIZLIK DASHBOARD (/ai-dashboard) ⭐ ENG MUHIM SAHIFA

**Layout:** Bu sahifa platformaning eng ta'sirli qismi — diplom himoyasida shu ko'rsatiladi.

**Yuqori qator (4 ta stat kartochka):**
- "AI holati" — Faol (yashil pulsating nuqta) yoki Nofaol
- "Bugungi anomaliyalar" — soni (qizil fon agar > 0)
- "Bloklangan sessiyalar" — soni
- "Model aniqligi" — F1-Score % (progress ring)

**Ikkinchi qator — Real vaqt xavf grafigi (to'liq kenglik):**
- Area chart: X — vaqt (oxirgi 24 soat), Y — anomaliya skori (0-1)
- Yashil zona (0-0.4), Sariq zona (0.4-0.7), Qizil zona (0.7-1.0)
- Har bir anomaliya nuqtasi katta doira bilan belgilangan
- Hover qilganda tooltip: Foydalanuvchi, Skor, Vaqt, Turi

**Uchinchi qator (60/40 bo'linish):**
- Chapda: "Oxirgi anomaliyalar" jadvali:
  | Foydalanuvchi | Rol | Skor | Turi | Vaqt | Holat | Amal |
  - Skor ustunida progress bar (0-1, ranglar bilan)
  - Holat: "Kutilmoqda" (sariq badge), "Hal qilindi" (yashil), "Bloklandi" (qizil)
  - Amal: "Batafsil" tugmasi (modal ochadi)

- O'ngda: "Anomaliya turlari" — Horizontal bar chart
  - murakkab_hujum, tez_faollik, ommaviy_yuklab_olish, boshqa_bolim, brute_force, vaqtdan_tashqari
  - Har biri o'z rangi bilan

**To'rtinchi qator — Anomaliya tafsilot paneli (modal yoki expandable):**
- **Foydalanuvchi ma'lumoti:** Ism, Rol, Konfessiya, Oxirgi kirish
- **Anomaliya skori:** Katta raqam (0.87) + rang indikator
- **AI tushuntirishi (Explainable AI):** 
  - "Odatdagidan 8x ko'p hujjat yuklab oldi" — 40% (progress bar)
  - "Ilk marta maxfiy bo'limga kirdi" — 35% (progress bar)
  - "Ish vaqtidan tashqari faollik" — 25% (progress bar)
- **Harakatlar:** "Sessiyani bloklash", "E'tiborsiz qoldirish", "Hisobot yaratish" tugmalari

---

### 7. FOYDALANUVCHILAR SAHIFASI (/users)

**Yuqorida:** "Foydalanuvchilar" sarlavhasi + "Yangi qo'shish" tugmasi

**Filtr:** Rol bo'yicha, Konfessiya bo'yicha, Holat (Faol/Bloklangan)

**Jadval:**
| Avatar | Ism Familiya | Email | Rol | Konfessiya | Holat | Oxirgi kirish | AI Xavf | Amallar |

- Rol ustunida rangli badge
- Holat: Faol (yashil), Bloklangan (qizil), Kutilmoqda (sariq)
- AI Xavf: mini progress bar (yashil/sariq/qizil)
- Amallar: Tahrirlash, Bloklash/Faollashtirish

---

### 8. BILDIRISHNOMALAR (/notifications)

**Layout:** Ro'yxat ko'rinishida

Har bir bildirishnoma kartochkasi:
- Chapda: Tur ikonkasi (🔔 oddiy, ⚠️ ogohlantirish, 🚨 xavf)
- O'rtada: Sarlavha (bold) + qisqa tavsif + vaqt
- O'ngda: "O'qildi" tugmasi
- O'qilmaganlar och ko'k fon bilan ajratilgan

---

### 9. SOZLAMALAR (/settings)

**Tab navigatsiya:** Profil | Parol | 2FA | Bildirishnoma sozlamalari

- **Profil:** Ism, familiya, email (o'zgartirib bo'lmaydi), rol (o'zgartirib bo'lmaydi)
- **Parol:** Joriy parol, yangi parol, tasdiqlash, kuchlilik indikatori
- **2FA:** QR kod ko'rsatish, yoqish/o'chirish
- **Bildirishnoma:** Email ogohlantirish (toggle), Telegram (toggle + token kiritish)

---

## RESPONSIVE DIZAYN

- **Desktop (1280px+):** To'liq layout — sidebar + content
- **Tablet (768-1279px):** Sidebar yig'iladi (faqat ikonkalar), content kengayadi  
- **Mobil (< 768px):** Sidebar hamburger menyu orqali ochiladi, jadvallar horizontal scroll

---

## ANIMATSIYALAR

- Sahifa o'tishlarida smooth fade-in (200ms)
- Kartochkalar hover da yengil ko'tarilish (translateY -2px + shadow kuchayadi)
- AI anomaliya aniqlanganda notification bell pulsating animatsiya
- Dashboard raqamlari sahifa ochilganda count-up animatsiya
- Skeleton loader sahifa yuklanayotganda

---

## IKONKALAR

Lucide React kutubxonasidan foydalanish:
- Shield, Lock, FileText, Users, Bell, Settings, BarChart3, 
- AlertTriangle, CheckCircle, XCircle, Eye, Download, Upload,
- Search, Menu, ChevronRight, LogOut, Brain (AI uchun)
