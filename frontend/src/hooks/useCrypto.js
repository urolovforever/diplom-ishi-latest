import {
  generateSymmetricKey,
  encryptData,
  decryptData,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  encryptFile as encryptFileUtil,
  decryptFile as decryptFileUtil,
  loadPrivateKey,
  base64ToBuffer,
  bufferToBase64,
} from '../utils/crypto';
import cryptoAPI from '../api/cryptoAPI';

export function useCrypto() {
  const isE2EReady = true; // Determined by key availability at usage time

  async function encryptConfession(content, recipientPublicKeys) {
    const symmetricKeyBase64 = await generateSymmetricKey();
    const { ciphertext, iv } = await encryptData(content, symmetricKeyBase64);
    const encryptedContent = JSON.stringify({ ciphertext, iv });

    const keyBytes = base64ToBuffer(symmetricKeyBase64);
    const encryptedKeys = [];
    for (const { userId, publicKeyJwk } of recipientPublicKeys) {
      const encryptedKey = await encryptWithPublicKey(new Uint8Array(keyBytes), publicKeyJwk);
      encryptedKeys.push({ user: userId, encrypted_key: encryptedKey });
    }

    return { encryptedContent, encryptedKeys };
  }

  async function decryptConfession(encryptedContent, encryptedKeys, currentUserId, password) {
    const myKey = encryptedKeys.find((k) => k.user === currentUserId);
    if (!myKey) throw new Error('No encrypted key found for current user');

    const privateKeyJwk = await loadPrivateKey(password);
    if (!privateKeyJwk) throw new Error('Could not load private key');

    const symmetricKeyBytes = await decryptWithPrivateKey(myKey.encrypted_key, privateKeyJwk);
    const symmetricKeyBase64 = bufferToBase64(symmetricKeyBytes);

    const { ciphertext, iv } = JSON.parse(encryptedContent);
    return await decryptData({ ciphertext, iv }, symmetricKeyBase64);
  }

  async function encryptDocument(file, recipientPublicKeys) {
    const symmetricKeyBase64 = await generateSymmetricKey();
    const arrayBuffer = await file.arrayBuffer();
    const { encryptedBlob, iv } = await encryptFileUtil(arrayBuffer, symmetricKeyBase64);

    const keyBytes = base64ToBuffer(symmetricKeyBase64);
    const encryptedKeys = [];
    for (const { userId, publicKeyJwk } of recipientPublicKeys) {
      const encryptedKey = await encryptWithPublicKey(new Uint8Array(keyBytes), publicKeyJwk);
      encryptedKeys.push({ user: userId, encrypted_key: encryptedKey });
    }

    return { encryptedBlob, iv, encryptedKeys };
  }

  async function decryptDocument(encryptedBlob, iv, encryptedKeys, currentUserId, password) {
    const myKey = encryptedKeys.find((k) => k.user === currentUserId);
    if (!myKey) throw new Error('No encrypted key found for current user');

    const privateKeyJwk = await loadPrivateKey(password);
    if (!privateKeyJwk) throw new Error('Could not load private key');

    const symmetricKeyBytes = await decryptWithPrivateKey(myKey.encrypted_key, privateKeyJwk);
    const symmetricKeyBase64 = bufferToBase64(symmetricKeyBytes);

    return await decryptFileUtil({ encryptedBlob, iv }, symmetricKeyBase64);
  }

  async function getRecipientPublicKeys(userIds) {
    const keys = [];
    for (const userId of userIds) {
      try {
        const response = await cryptoAPI.getUserPublicKey(userId);
        if (response.data.public_key) {
          keys.push({
            userId,
            publicKeyJwk: JSON.parse(response.data.public_key),
          });
        }
      } catch {
        // Skip users without public keys
      }
    }
    return keys;
  }

  return {
    isE2EReady,
    encryptConfession,
    decryptConfession,
    encryptDocument,
    decryptDocument,
    getRecipientPublicKeys,
  };
}
