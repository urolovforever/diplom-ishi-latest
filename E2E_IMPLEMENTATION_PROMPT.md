# E2E Encryption Implementation Prompt

## Project Context

Bu "Secure Confession Platform" — Django 4.2 + DRF backend va React 18 + Redux Toolkit frontend dan iborat. Hozirda server-side AES-256-CBC encryption mavjud (`/backend/documents/encryption.py`). Vazifa — confession matnlari va hujjatlar uchun haqiqiy End-to-End Encryption qo'shish, shunda server hech qachon ochiq matnni ko'rmasin.

---

## Prompt

```
Menga quyidagi loyihaga End-to-End Encryption (E2E) qo'shishda yordam ber.

### Loyiha texnologiyalari:
- Backend: Django 4.2 + Django REST Framework 3.15 + PostgreSQL 15
- Frontend: React 18 + Redux Toolkit + Axios + Vite
- Hozirgi auth: JWT (simplejwt) + TOTP/SMS 2FA
- Hozirgi shifrlash: Server-side AES-256-CBC (backend/documents/encryption.py)

### Arxitektura talablari:

1. **Kalit boshqaruvi (Key Management)**:
   - Har bir foydalanuvchi ro'yxatdan o'tganda brauzerda RSA-OAEP 4096-bit key pair yaratilsin (Web Crypto API)
   - Public key serverga yuborilsin va `CustomUser` modeliga saqlansin (yangi field: `public_key` TextField)
   - Private key foydalanuvchining brauzerida IndexedDB da shifrlangan holda saqlansin
   - Private key ni shifrlash uchun foydalanuvchi parolidan PBKDF2 bilan kalit hosil qilinsin
   - Parol o'zgarganda private key qayta shifrlangan holda saqlansin
   - Recovery mechanism: encrypted private key serverda ham backup sifatida saqlansin (yangi field: `encrypted_private_key` TextField)

2. **Confession E2E shifrlash**:
   - Confession yaratilganda frontend da tasodifiy AES-256-GCM symmetric key yaratilsin
   - Confession matni shu symmetric key bilan shifrlansin
   - Symmetric key qabul qiluvchilar (Confession Leader, Qomita Rahbar, Super Admin) ning public key lari bilan shifrlansin
   - Yangi model: `EncryptedKey` (confession_id, user_id, encrypted_symmetric_key)
   - Backend faqat shifrlangan matn va shifrlangan kalitlarni saqlaydi
   - O'qish: frontend foydalanuvchining private key bilan symmetric key ni deshifrlaydi, keyin matnni deshifrlaydi

3. **Document E2E shifrlash**:
   - Hujjat yuklashda frontend da fayl AES-256-GCM bilan shifrlansin
   - Symmetric key tegishli rollar public key lari bilan shifrlansin
   - Yangi model: `DocumentEncryptedKey` (document_id, user_id, encrypted_symmetric_key)
   - Yuklab olishda frontend deshifrlaydi
   - Hozirgi server-side encryption (`documents/encryption.py`) ni E2E ga almashtir

4. **Anonymous confession maxsus holati**:
   - Anonim confessionlarda ham E2E ishlashi kerak
   - Confession Leader va admin public key lari bilan shifrlanadi
   - Muallif o'zi ham o'qiy olishi uchun o'z public key bilan ham shifrlanadi

5. **Frontend amalga oshirish**:
   - Yangi util fayl: `frontend/src/utils/crypto.js` — barcha kriptografik funksiyalar
     - `generateKeyPair()` — RSA-OAEP 4096-bit
     - `encryptWithPublicKey(data, publicKey)` — RSA bilan shifrlash
     - `decryptWithPrivateKey(data, privateKey)` — RSA bilan deshifrlash
     - `generateSymmetricKey()` — AES-256-GCM
     - `encryptData(plaintext, symmetricKey)` — matn shifrlash
     - `decryptData(ciphertext, symmetricKey)` — matn deshifrlash
     - `encryptFile(file, symmetricKey)` — fayl shifrlash
     - `decryptFile(encryptedBlob, symmetricKey)` — fayl deshifrlash
     - `deriveKeyFromPassword(password)` — PBKDF2 paroldan kalit
     - `storePrivateKey(privateKey, password)` — IndexedDB ga saqlash
     - `loadPrivateKey(password)` — IndexedDB dan o'qish
   - Barchasi Web Crypto API (`window.crypto.subtle`) ishlatsin — tashqi kutubxona shart emas

6. **Backend o'zgarishlar**:
   - `accounts/models.py` ga qo'shish:
     - `public_key = models.TextField(null=True, blank=True)`
     - `encrypted_private_key = models.TextField(null=True, blank=True)`
   - Yangi model `confessions/models.py` ga:
     ```python
     class ConfessionEncryptedKey(models.Model):
         id = models.UUIDField(primary_key=True, default=uuid.uuid4)
         confession = models.ForeignKey(Confession, on_delete=models.CASCADE, related_name='encrypted_keys')
         user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
         encrypted_key = models.TextField()  # Base64 encoded
         created_at = models.DateTimeField(auto_now_add=True)
     ```
   - Yangi model `documents/models.py` ga:
     ```python
     class DocumentEncryptedKey(models.Model):
         id = models.UUIDField(primary_key=True, default=uuid.uuid4)
         document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='encrypted_keys')
         user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
         encrypted_key = models.TextField()  # Base64 encoded
         created_at = models.DateTimeField(auto_now_add=True)
     ```
   - API endpointlar:
     - `POST /accounts/public-key/` — public key saqlash
     - `GET /accounts/users/<uuid>/public-key/` — foydalanuvchining public key ni olish
     - Confession create/update da `encrypted_keys` qabul qilish
     - Document upload da `encrypted_keys` qabul qilish

7. **Confession yaratish yangi flow**:
   ```
   Frontend:
   1. symmetricKey = generateSymmetricKey()
   2. encryptedContent = encryptData(confessionText, symmetricKey)
   3. recipients = [confessionLeader, qomitaRahbar, superAdmin]
   4. for each recipient:
        encryptedKey = encryptWithPublicKey(symmetricKey, recipient.publicKey)
   5. POST /confessions/ {
        content: encryptedContent,        // shifrlangan matn
        is_encrypted: true,
        encrypted_keys: [
          {user_id: "...", encrypted_key: "..."},
          {user_id: "...", encrypted_key: "..."},
        ]
      }
   ```

8. **Confession o'qish yangi flow**:
   ```
   Frontend:
   1. GET /confessions/<id>/ → {content: "shifrlangan...", encrypted_keys: [...]}
   2. myEncryptedKey = encrypted_keys.find(k => k.user_id === currentUser.id)
   3. privateKey = loadPrivateKey(userPassword)  // IndexedDB dan
   4. symmetricKey = decryptWithPrivateKey(myEncryptedKey.encrypted_key, privateKey)
   5. plaintext = decryptData(confession.content, symmetricKey)
   6. Ko'rsatish: plaintext
   ```

9. **Migration strategy**:
   - Eski shifrlanmagan confession lar uchun backward compatibility saqla
   - `is_e2e_encrypted` boolean field qo'sh Confession modeliga
   - Agar `is_e2e_encrypted = False` → eski usulda ko'rsat
   - Agar `is_e2e_encrypted = True` → E2E deshifrlash

10. **Xavfsizlik talablari**:
    - Private key hech qachon serverga ochiq holda yuborilmasin
    - Web Crypto API `extractable: false` (iloji bo'lsa) ishlatilsin
    - Symmetric key lar har bir confession/document uchun yangi yaratilsin (key reuse yo'q)
    - IV (nonce) har bir shifrlash uchun tasodifiy 12-byte bo'lsin (GCM uchun)
    - Base64 encoding ishlatilsin network transport uchun

11. **Test yozish**:
    - Frontend: crypto.js uchun unit testlar (Jest)
    - Backend: yangi modellar va API lar uchun testlar
    - Integration: confession yaratish → o'qish full cycle test

Har bir faylni to'liq kod bilan yoz. Avval backend modellar va migration,
keyin API viewlar, keyin frontend crypto utility, keyin UI integratsiya.
```

---

## Fayl tuzilmasi (yaratilishi kerak bo'lgan yangi fayllar)

```
backend/
├── accounts/
│   └── models.py          ← public_key, encrypted_private_key fieldlar qo'shiladi
├── confessions/
│   ├── models.py          ← ConfessionEncryptedKey model, is_e2e_encrypted field
│   ├── serializers.py     ← encrypted_keys nested serializer
│   └── views.py           ← create/read logikasi yangilanadi
├── documents/
│   ├── models.py          ← DocumentEncryptedKey model
│   ├── serializers.py     ← encrypted_keys nested serializer
│   └── views.py           ← upload/download logikasi yangilanadi

frontend/src/
├── utils/
│   └── crypto.js          ← YANGI: barcha E2E kriptografik funksiyalar
├── api/
│   └── cryptoAPI.js       ← YANGI: public key API calls
├── hooks/
│   └── useCrypto.js       ← YANGI: E2E shifrlash/deshifrlash hook
├── store/
│   └── cryptoSlice.js     ← YANGI: kalit holatini boshqarish
├── pages/
│   ├── CreateConfessionPage.jsx  ← shifrlash qo'shiladi
│   └── ConfessionDetailPage.jsx  ← deshifrlash qo'shiladi
└── components/
    └── auth/
        └── KeySetup.jsx   ← YANGI: birinchi kirish — kalit yaratish UI
```
