/**
 * E2E Encryption utility using Web Crypto API
 * RSA-OAEP 4096-bit for key exchange, AES-256-GCM for data encryption
 */

const DB_NAME = 'scp_crypto';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

// --- IndexedDB Helpers ---

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

// --- Base64 Helpers ---

export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
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
}

// --- Private Key Storage (IndexedDB) ---

export async function storePrivateKey(privateKeyJwk, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await deriveKeyFromPassword(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(privateKeyJwk));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derivedKey, encoded);
  const encryptedData = {
    encrypted: bufferToBase64(encrypted),
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
  };
  await idbPut('private_key', encryptedData);
  return encryptedData;
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

export async function clearStoredKeys() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
