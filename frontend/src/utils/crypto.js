/**
 * E2E Encryption utility using Web Crypto API
 * RSA-OAEP 4096-bit for key exchange, AES-256-GCM for data encryption
 */

const DB_NAME = 'scp_e2e_keys';
const DB_VERSION = 1;
const STORE_NAME = 'private_keys';

// ==================== RSA Key Pair ====================

export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
const DB_NAME = 'scp_crypto';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

function idbGet(key) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

function idbPut(key, value) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
  );
}

// --- Key Generation ---

export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true, // extractable — needed to export keys
    ['encrypt', 'decrypt']
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return {
    publicKey: JSON.stringify(publicKeyJwk),
    privateKey: JSON.stringify(privateKeyJwk),
  };
}

// ==================== RSA Encrypt/Decrypt ====================

export async function encryptWithPublicKey(data, publicKeyStr) {
  const publicKeyJwk = JSON.parse(publicKeyStr);
  const publicKey = await window.crypto.subtle.importKey(
    true,
    ['encrypt', 'decrypt']
  );
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  return { publicKeyJwk, privateKeyJwk };
}

export async function generateSymmetricKey() {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const raw = await crypto.subtle.exportKey('raw', key);
  return bufferToBase64(raw);
}

// --- RSA Encrypt/Decrypt ---

export async function encryptWithPublicKey(dataBytes, publicKeyJwk) {
  const pubKey = await crypto.subtle.importKey(
    'jwk',
    publicKeyJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  const encoded = new TextEncoder().encode(data);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    encoded
  );

  return arrayBufferToBase64(encrypted);
}

export async function decryptWithPrivateKey(encryptedBase64, privateKeyStr) {
  const privateKeyJwk = JSON.parse(privateKeyStr);
  const privateKey = await window.crypto.subtle.importKey(
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pubKey, dataBytes);
  return bufferToBase64(encrypted);
}

export async function decryptWithPrivateKey(base64Ciphertext, privateKeyJwk) {
  const privKey = await crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );

  const encrypted = base64ToArrayBuffer(encryptedBase64);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

// ==================== AES-256-GCM Symmetric ====================

export async function generateSymmetricKey() {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exported = await window.crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

export async function encryptData(plaintext, symmetricKeyBase64) {
  const keyBuffer = base64ToArrayBuffer(symmetricKeyBase64);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  // Prepend IV to ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

export async function decryptData(encryptedBase64, symmetricKeyBase64) {
  const keyBuffer = base64ToArrayBuffer(symmetricKeyBase64);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// ==================== File Encryption ====================

export async function encryptFile(file, symmetricKeyBase64) {
  const keyBuffer = base64ToArrayBuffer(symmetricKeyBase64);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fileBuffer
  );

  // Prepend IV to ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return new Blob([combined], { type: 'application/octet-stream' });
}

export async function decryptFile(encryptedBlob, symmetricKeyBase64) {
  const keyBuffer = base64ToArrayBuffer(symmetricKeyBase64);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const combined = new Uint8Array(await encryptedBlob.arrayBuffer());
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new Blob([decrypted]);
}

// ==================== Password-based key derivation ====================

export async function deriveKeyFromPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt || enc.encode('scp-e2e-private-key-salt'),
  const cipherBytes = base64ToBuffer(base64Ciphertext);
  return await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privKey, cipherBytes);
}

// --- AES-GCM Encrypt/Decrypt ---

export async function encryptData(plaintext, symmetricKeyBase64) {
  const keyBuf = base64ToBuffer(symmetricKeyBase64);
  const key = await crypto.subtle.importKey('raw', keyBuf, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv),
  };
}

export async function decryptData({ ciphertext, iv }, symmetricKeyBase64) {
  const keyBuf = base64ToBuffer(symmetricKeyBase64);
  const key = await crypto.subtle.importKey('raw', keyBuf, 'AES-GCM', false, ['decrypt']);
  const ivBuf = base64ToBuffer(iv);
  const cipherBuf = base64ToBuffer(ciphertext);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, key, cipherBuf);
  return new TextDecoder().decode(decrypted);
}

export async function encryptFile(arrayBuffer, symmetricKeyBase64) {
  const keyBuf = base64ToBuffer(symmetricKeyBase64);
  const key = await crypto.subtle.importKey('raw', keyBuf, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, arrayBuffer);
  return {
    encryptedBlob: new Blob([ciphertext]),
    iv: bufferToBase64(iv),
  };
}

export async function decryptFile({ encryptedBlob, iv }, symmetricKeyBase64) {
  const keyBuf = base64ToBuffer(symmetricKeyBase64);
  const key = await crypto.subtle.importKey('raw', keyBuf, 'AES-GCM', false, ['decrypt']);
  const ivBuf = base64ToBuffer(iv);
  const cipherBuf = await encryptedBlob.arrayBuffer();
  return await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, key, cipherBuf);
}

// --- PBKDF2 Key Derivation ---

export async function deriveKeyFromPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: typeof salt === 'string' ? enc.encode(salt) : salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exported = await window.crypto.subtle.exportKey('raw', derivedKey);
  return arrayBufferToBase64(exported);
}

export async function encryptPrivateKey(privateKeyStr, password) {
  const derivedKey = await deriveKeyFromPassword(password);
  return encryptData(privateKeyStr, derivedKey);
}

export async function decryptPrivateKey(encryptedPrivateKey, password) {
  const derivedKey = await deriveKeyFromPassword(password);
  return decryptData(encryptedPrivateKey, derivedKey);
}

// ==================== IndexedDB Storage ====================

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storePrivateKey(userId, encryptedPrivateKey) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({
      id: userId,
      encryptedPrivateKey,
      updatedAt: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadEncryptedPrivateKey(userId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(userId);
    request.onsuccess = () => resolve(request.result?.encryptedPrivateKey || null);
    request.onerror = () => reject(request.error);
  });
}

export async function clearStoredKeys() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ==================== Utility ====================

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
}

// --- Private Key Storage (IndexedDB) ---

export async function storePrivateKey(privateKeyJwk, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await deriveKeyFromPassword(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(privateKeyJwk));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derivedKey, encoded);
  await idbPut('private_key', {
    encrypted: bufferToBase64(encrypted),
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
  });
}

export async function loadPrivateKey(password) {
  const stored = await idbGet('private_key');
  if (!stored) return null;
  const salt = base64ToBuffer(stored.salt);
  const derivedKey = await deriveKeyFromPassword(password, salt);
  const iv = base64ToBuffer(stored.iv);
  const cipherBuf = base64ToBuffer(stored.encrypted);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, cipherBuf);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

export async function hasStoredPrivateKey() {
  const stored = await idbGet('private_key');
  return !!stored;
}

// --- Base64 Helpers ---

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export { bufferToBase64, base64ToBuffer };
