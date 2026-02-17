import { describe, it, expect, beforeEach } from 'vitest';
import {
  bufferToBase64,
  base64ToBuffer,
  generateKeyPair,
  generateSymmetricKey,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  encryptData,
  decryptData,
  encryptFile,
  decryptFile,
  deriveKeyFromPassword,
  storePrivateKey,
  loadPrivateKey,
  hasStoredPrivateKey,
  clearStoredKeys,
} from '../crypto.js';

// --- Base64 Helpers ---

describe('bufferToBase64 / base64ToBuffer', () => {
  it('round-trips an ArrayBuffer through base64', () => {
    const original = new Uint8Array([0, 1, 127, 128, 255]);
    const b64 = bufferToBase64(original.buffer);
    expect(typeof b64).toBe('string');
    const restored = new Uint8Array(base64ToBuffer(b64));
    expect(restored).toEqual(original);
  });

  it('handles empty buffer', () => {
    const empty = new Uint8Array([]);
    const b64 = bufferToBase64(empty.buffer);
    expect(b64).toBe('');
    const restored = new Uint8Array(base64ToBuffer(b64));
    expect(restored.length).toBe(0);
  });

  it('produces valid base64 string', () => {
    const data = new Uint8Array([72, 101, 108, 108, 111]);
    const b64 = bufferToBase64(data.buffer);
    expect(b64).toMatch(/^[A-Za-z0-9+/]*=*$/);
  });
});

// --- Key Generation ---

describe('generateKeyPair', () => {
  it('generates RSA-OAEP 4096-bit key pair in JWK format', async () => {
    const { publicKeyJwk, privateKeyJwk } = await generateKeyPair();

    expect(publicKeyJwk.kty).toBe('RSA');
    expect(publicKeyJwk.alg).toBe('RSA-OAEP-256');
    expect(publicKeyJwk.key_ops).toContain('encrypt');

    expect(privateKeyJwk.kty).toBe('RSA');
    expect(privateKeyJwk.alg).toBe('RSA-OAEP-256');
    expect(privateKeyJwk.key_ops).toContain('decrypt');
    expect(privateKeyJwk.d).toBeDefined();
  });

  it('generates unique key pairs each time', async () => {
    const pair1 = await generateKeyPair();
    const pair2 = await generateKeyPair();
    expect(pair1.publicKeyJwk.n).not.toBe(pair2.publicKeyJwk.n);
  });
}, 30000);

describe('generateSymmetricKey', () => {
  it('generates a base64-encoded AES-256 key', async () => {
    const key = await generateSymmetricKey();
    expect(typeof key).toBe('string');
    const keyBytes = base64ToBuffer(key);
    expect(keyBytes.byteLength).toBe(32); // 256 bits
  });

  it('generates unique keys each time', async () => {
    const key1 = await generateSymmetricKey();
    const key2 = await generateSymmetricKey();
    expect(key1).not.toBe(key2);
  });
});

// --- RSA Encrypt / Decrypt ---

describe('RSA encryptWithPublicKey / decryptWithPrivateKey', () => {
  it('encrypts and decrypts small data with RSA-OAEP', async () => {
    const { publicKeyJwk, privateKeyJwk } = await generateKeyPair();

    const plaintext = new TextEncoder().encode('Hello E2E!');
    const ciphertext = await encryptWithPublicKey(plaintext, publicKeyJwk);

    expect(typeof ciphertext).toBe('string');
    expect(ciphertext).not.toBe('');

    const decrypted = await decryptWithPrivateKey(ciphertext, privateKeyJwk);
    const result = new TextDecoder().decode(decrypted);
    expect(result).toBe('Hello E2E!');
  });

  it('produces different ciphertext for same plaintext (due to OAEP padding)', async () => {
    const { publicKeyJwk } = await generateKeyPair();
    const data = new TextEncoder().encode('test');

    const ct1 = await encryptWithPublicKey(data, publicKeyJwk);
    const ct2 = await encryptWithPublicKey(data, publicKeyJwk);
    expect(ct1).not.toBe(ct2);
  });
}, 30000);

// --- AES-GCM Data Encrypt / Decrypt ---

describe('encryptData / decryptData', () => {
  it('encrypts and decrypts text with AES-256-GCM', async () => {
    const symmetricKey = await generateSymmetricKey();
    const plaintext = "Salom, dunyo! Bu maxfiy xabar.";

    const { ciphertext, iv } = await encryptData(plaintext, symmetricKey);

    expect(typeof ciphertext).toBe('string');
    expect(typeof iv).toBe('string');
    expect(ciphertext).not.toBe('');

    const decrypted = await decryptData({ ciphertext, iv }, symmetricKey);
    expect(decrypted).toBe(plaintext);
  });

  it('uses unique IV for each encryption', async () => {
    const symmetricKey = await generateSymmetricKey();
    const { iv: iv1 } = await encryptData('test', symmetricKey);
    const { iv: iv2 } = await encryptData('test', symmetricKey);
    expect(iv1).not.toBe(iv2);
  });

  it('generates 12-byte IV (standard for AES-GCM)', async () => {
    const symmetricKey = await generateSymmetricKey();
    const { iv } = await encryptData('test', symmetricKey);
    const ivBuffer = base64ToBuffer(iv);
    expect(ivBuffer.byteLength).toBe(12);
  });

  it('fails decryption with wrong key', async () => {
    const key1 = await generateSymmetricKey();
    const key2 = await generateSymmetricKey();
    const { ciphertext, iv } = await encryptData('secret', key1);

    await expect(decryptData({ ciphertext, iv }, key2)).rejects.toThrow();
  });

  it('handles unicode text', async () => {
    const symmetricKey = await generateSymmetricKey();
    const plaintext = "O'zbek tili 🔐 中文 العربية";
    const encrypted = await encryptData(plaintext, symmetricKey);
    const decrypted = await decryptData(encrypted, symmetricKey);
    expect(decrypted).toBe(plaintext);
  });

  it('handles empty string', async () => {
    const symmetricKey = await generateSymmetricKey();
    const encrypted = await encryptData('', symmetricKey);
    const decrypted = await decryptData(encrypted, symmetricKey);
    expect(decrypted).toBe('');
  });
});

// --- AES-GCM File Encrypt / Decrypt ---

describe('encryptFile / decryptFile', () => {
  it('encrypts and decrypts binary data (file simulation)', async () => {
    const symmetricKey = await generateSymmetricKey();
    const fileContent = new Uint8Array([1, 2, 3, 4, 5, 100, 200, 255]);

    const { encryptedBlob, iv } = await encryptFile(fileContent.buffer, symmetricKey);

    expect(encryptedBlob).toBeInstanceOf(Blob);
    expect(typeof iv).toBe('string');

    const decrypted = await decryptFile({ encryptedBlob, iv }, symmetricKey);
    const result = new Uint8Array(decrypted);
    expect(result).toEqual(fileContent);
  });

  it('handles large data', async () => {
    const symmetricKey = await generateSymmetricKey();
    const largeData = new Uint8Array(100000);
    for (let i = 0; i < largeData.length; i++) largeData[i] = i % 256;

    const { encryptedBlob, iv } = await encryptFile(largeData.buffer, symmetricKey);
    const decrypted = await decryptFile({ encryptedBlob, iv }, symmetricKey);
    expect(new Uint8Array(decrypted)).toEqual(largeData);
  });
});

// --- PBKDF2 Key Derivation ---

describe('deriveKeyFromPassword', () => {
  it('derives a CryptoKey from password and salt', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKeyFromPassword('myPassword123', salt);

    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.algorithm.name).toBe('AES-GCM');
  });

  it('produces the same key for same password and salt', async () => {
    const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const key1 = await deriveKeyFromPassword('testPass', salt);
    const key2 = await deriveKeyFromPassword('testPass', salt);

    const raw1 = await crypto.subtle.exportKey('raw', key1);
    const raw2 = await crypto.subtle.exportKey('raw', key2);
    expect(bufferToBase64(raw1)).toBe(bufferToBase64(raw2));
  });

  it('produces different keys for different passwords', async () => {
    const salt = new Uint8Array(16);
    const key1 = await deriveKeyFromPassword('password1', salt);
    const key2 = await deriveKeyFromPassword('password2', salt);

    const raw1 = await crypto.subtle.exportKey('raw', key1);
    const raw2 = await crypto.subtle.exportKey('raw', key2);
    expect(bufferToBase64(raw1)).not.toBe(bufferToBase64(raw2));
  });

  it('accepts string salt', async () => {
    const key = await deriveKeyFromPassword('pass', 'stringSalt');
    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
  });
});

// --- IndexedDB Private Key Storage ---

describe('Private Key Storage (IndexedDB)', () => {
  beforeEach(async () => {
    await clearStoredKeys();
  });

  it('hasStoredPrivateKey returns false when no key stored', async () => {
    const has = await hasStoredPrivateKey();
    expect(has).toBe(false);
  });

  it('stores and loads a private key with password', async () => {
    const { privateKeyJwk } = await generateKeyPair();
    const password = 'testPassword123';

    const encryptedData = await storePrivateKey(privateKeyJwk, password);
    expect(encryptedData).toBeDefined();
    expect(encryptedData.encrypted).toBeDefined();
    expect(encryptedData.iv).toBeDefined();
    expect(encryptedData.salt).toBeDefined();

    const has = await hasStoredPrivateKey();
    expect(has).toBe(true);

    const loaded = await loadPrivateKey(password);
    expect(loaded).toEqual(privateKeyJwk);
  }, 30000);

  it('returns null when loading with wrong password', async () => {
    const { privateKeyJwk } = await generateKeyPair();
    await storePrivateKey(privateKeyJwk, 'correctPassword');

    await expect(loadPrivateKey('wrongPassword')).rejects.toThrow();
  }, 30000);

  it('clearStoredKeys removes all keys', async () => {
    const { privateKeyJwk } = await generateKeyPair();
    await storePrivateKey(privateKeyJwk, 'pass');

    expect(await hasStoredPrivateKey()).toBe(true);
    await clearStoredKeys();
    expect(await hasStoredPrivateKey()).toBe(false);
  }, 30000);

  it('storePrivateKey returns encrypted data for server backup', async () => {
    const { privateKeyJwk } = await generateKeyPair();
    const encryptedData = await storePrivateKey(privateKeyJwk, 'backup123');

    // Verify the returned data is encrypted (not raw JWK)
    expect(encryptedData.encrypted).not.toContain(privateKeyJwk.d);
    expect(typeof encryptedData.encrypted).toBe('string');
    expect(typeof encryptedData.iv).toBe('string');
    expect(typeof encryptedData.salt).toBe('string');
  }, 30000);
});

// --- Full E2E Encryption Flow ---

describe('Full E2E Confession Encryption Flow', () => {
  it('simulates confession create and read with E2E encryption', async () => {
    // 1. Generate key pairs for author and admin
    const author = await generateKeyPair();
    const admin = await generateKeyPair();

    // 2. Create symmetric key and encrypt confession
    const symmetricKey = await generateSymmetricKey();
    const confessionText = "Bu maxfiy confession matni.";
    const { ciphertext, iv } = await encryptData(confessionText, symmetricKey);

    // 3. Encrypt symmetric key for each recipient
    const keyBytes = new Uint8Array(base64ToBuffer(symmetricKey));
    const authorEncKey = await encryptWithPublicKey(keyBytes, author.publicKeyJwk);
    const adminEncKey = await encryptWithPublicKey(keyBytes, admin.publicKeyJwk);

    // 4. Simulate server storage (only encrypted data)
    const serverData = {
      content: JSON.stringify({ ciphertext, iv }),
      encrypted_keys: [
        { user: 'author-uuid', encrypted_key: authorEncKey },
        { user: 'admin-uuid', encrypted_key: adminEncKey },
      ],
    };

    // 5. Author reads the confession
    const parsed = JSON.parse(serverData.content);
    const authorKey = serverData.encrypted_keys[0];
    const decryptedSymKey = await decryptWithPrivateKey(
      authorKey.encrypted_key,
      author.privateKeyJwk
    );
    const restoredSymKey = bufferToBase64(decryptedSymKey);
    const decryptedText = await decryptData(parsed, restoredSymKey);
    expect(decryptedText).toBe(confessionText);

    // 6. Admin also reads the same confession
    const adminKey = serverData.encrypted_keys[1];
    const adminDecryptedSymKey = await decryptWithPrivateKey(
      adminKey.encrypted_key,
      admin.privateKeyJwk
    );
    const adminRestoredSymKey = bufferToBase64(adminDecryptedSymKey);
    const adminDecryptedText = await decryptData(parsed, adminRestoredSymKey);
    expect(adminDecryptedText).toBe(confessionText);
  }, 60000);
});
