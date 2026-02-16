import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  generateKeyPair,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  generateSymmetricKey,
  encryptData,
  decryptData,
  encryptFile,
  decryptFile,
  encryptPrivateKey,
  decryptPrivateKey,
  storePrivateKey,
  loadEncryptedPrivateKey,
} from '../utils/crypto';
import {
  fetchMyKeys,
  savePublicKey,
  fetchRecipients,
  setPrivateKey,
  clearPrivateKey,
} from '../store/cryptoSlice';

export function useCrypto() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const {
    hasPublicKey,
    publicKey,
    encryptedPrivateKey,
    privateKeyUnlocked,
    recipients,
  } = useSelector((state) => state.crypto);

  // Check if E2E is set up for current user
  const isE2EReady = hasPublicKey && !!privateKeyUnlocked;

  // Initialize keys: generate key pair and save
  const setupKeys = useCallback(async (password) => {
    const { publicKey: pubKey, privateKey: privKey } = await generateKeyPair();

    // Encrypt private key with password
    const encPrivKey = await encryptPrivateKey(privKey, password);

    // Save to server
    await dispatch(savePublicKey({
      public_key: pubKey,
      encrypted_private_key: encPrivKey,
    })).unwrap();

    // Save to IndexedDB
    await storePrivateKey(user.id, encPrivKey);

    // Store decrypted private key in memory
    dispatch(setPrivateKey(privKey));

    return { publicKey: pubKey, privateKey: privKey };
  }, [dispatch, user?.id]);

  // Unlock private key with password
  const unlockPrivateKey = useCallback(async (password) => {
    // Try IndexedDB first
    let encPrivKey = await loadEncryptedPrivateKey(user.id);

    // Fallback to server backup
    if (!encPrivKey) {
      const result = await dispatch(fetchMyKeys()).unwrap();
      encPrivKey = result.encrypted_private_key;
      if (encPrivKey) {
        // Cache in IndexedDB
        await storePrivateKey(user.id, encPrivKey);
      }
    }

    if (!encPrivKey) {
      throw new Error('No encrypted private key found. Please set up E2E encryption first.');
    }

    const privKey = await decryptPrivateKey(encPrivKey, password);
    dispatch(setPrivateKey(privKey));
    return privKey;
  }, [dispatch, user?.id]);

  // Encrypt confession content for all recipients
  const encryptConfession = useCallback(async (content, organizationId) => {
    const result = await dispatch(fetchRecipients(organizationId)).unwrap();

    const symKey = await generateSymmetricKey();
    const encryptedContent = await encryptData(content, symKey);

    const encryptedKeys = [];
    for (const recipient of result) {
      const encKey = await encryptWithPublicKey(symKey, recipient.public_key);
      encryptedKeys.push({
        user_id: recipient.user_id,
        encrypted_key: encKey,
      });
    }

    return { encryptedContent, encryptedKeys };
  }, [dispatch]);

  // Decrypt confession content
  const decryptConfession = useCallback(async (encryptedContent, encryptedKeys) => {
    if (!privateKeyUnlocked) {
      throw new Error('Private key not unlocked. Please enter your password.');
    }

    const myKey = encryptedKeys.find((k) => k.user_id === user.id);
    if (!myKey) {
      throw new Error('You do not have access to decrypt this confession.');
    }

    const symKey = await decryptWithPrivateKey(myKey.encrypted_key, privateKeyUnlocked);
    const plaintext = await decryptData(encryptedContent, symKey);
    return plaintext;
  }, [privateKeyUnlocked, user?.id]);

  // Encrypt a file for all recipients
  const encryptDocument = useCallback(async (file, organizationId) => {
    const result = await dispatch(fetchRecipients(organizationId)).unwrap();

    const symKey = await generateSymmetricKey();
    const encryptedBlob = await encryptFile(file, symKey);

    const encryptedKeys = [];
    for (const recipient of result) {
      const encKey = await encryptWithPublicKey(symKey, recipient.public_key);
      encryptedKeys.push({
        user_id: recipient.user_id,
        encrypted_key: encKey,
      });
    }

    return { encryptedBlob, encryptedKeys };
  }, [dispatch]);

  // Decrypt a file
  const decryptDocument = useCallback(async (encryptedBlob, encryptedKeys) => {
    if (!privateKeyUnlocked) {
      throw new Error('Private key not unlocked. Please enter your password.');
    }

    const myKey = encryptedKeys.find((k) => k.user_id === user.id);
    if (!myKey) {
      throw new Error('You do not have access to decrypt this document.');
    }

    const symKey = await decryptWithPrivateKey(myKey.encrypted_key, privateKeyUnlocked);
    const decryptedBlob = await decryptFile(encryptedBlob, symKey);
    return decryptedBlob;
  }, [privateKeyUnlocked, user?.id]);

  return {
    isE2EReady,
    hasPublicKey,
    privateKeyUnlocked,
    recipients,
    setupKeys,
    unlockPrivateKey,
    encryptConfession,
    decryptConfession,
    encryptDocument,
    decryptDocument,
    lockPrivateKey: () => dispatch(clearPrivateKey()),
  };
}
