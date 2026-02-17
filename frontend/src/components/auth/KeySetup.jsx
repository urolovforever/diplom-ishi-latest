import { useState } from 'react';
import { useCrypto } from '../../hooks/useCrypto';

function KeySetup({ onComplete }) {
  const { hasPublicKey, setupKeys, unlockPrivateKey } = useCrypto();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSetup = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);

    try {
      if (hasPublicKey) {
        // Unlock existing keys
        await unlockPrivateKey(password);
      } else {
        // Generate new keys
        await setupKeys(password);
      }
      onComplete?.();
    } catch (err) {
      setError(
        hasPublicKey
          ? 'Failed to unlock keys. Check your password.'
          : 'Failed to set up encryption keys.'
      );
    } finally {
      setLoading(false);
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkKeyStatus, uploadPublicKey } from '../../store/cryptoSlice';
import { generateKeyPair, storePrivateKey, hasStoredPrivateKey } from '../../utils/crypto';

function KeySetup({ children }) {
  const dispatch = useDispatch();
  const { keyPairGenerated, loading } = useSelector((state) => state.crypto);
  const { token } = useSelector((state) => state.auth);
  const [generating, setGenerating] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [hasLocalKey, setHasLocalKey] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (token) {
      dispatch(checkKeyStatus()).then(() => setChecked(true));
      hasStoredPrivateKey().then(setHasLocalKey);
    }
  }, [dispatch, token]);

  if (!checked || loading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Checking encryption keys...</p></div>;
  }

  if (keyPairGenerated && hasLocalKey) {
    return children;
  }

  if (success) {
    return children;
  }

  const handleGenerate = async () => {
    setError(null);
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setGenerating(true);
    try {
      const { publicKeyJwk, privateKeyJwk } = await generateKeyPair();

      await storePrivateKey(privateKeyJwk, password);

      const encryptedPrivateKeyBackup = JSON.stringify(privateKeyJwk);

      await dispatch(
        uploadPublicKey({
          public_key: JSON.stringify(publicKeyJwk),
          encrypted_private_key: encryptedPrivateKeyBackup,
        })
      ).unwrap();

      setHasLocalKey(true);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Key generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-800">
          {hasPublicKey ? 'Unlock E2E Encryption' : 'Set Up E2E Encryption'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {hasPublicKey
            ? 'Enter your password to decrypt your private key and enable end-to-end encryption.'
            : 'Create your encryption keys to enable end-to-end encrypted confessions. Your password will be used to protect your private key.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSetup}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-2">E2E Encryption Setup</h2>
        <p className="text-gray-600 mb-6 text-sm">
          To protect your confessions with end-to-end encryption, we need to generate a unique
          encryption key pair. Your private key will be encrypted with a password and stored
          securely in your browser.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Encryption Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your account password"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? 'Processing...'
            : hasPublicKey
            ? 'Unlock Keys'
            : 'Generate Keys'}
        </button>
      </form>

      <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-500">
        <p className="font-medium mb-1">How E2E encryption works:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Your private key is encrypted with your password</li>
          <li>The server never sees your private key</li>
          <li>Confessions are encrypted in your browser before sending</li>
          <li>Only authorized users can decrypt the content</li>
        </ul>
            placeholder="Min. 8 characters"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? 'Generating Keys...' : 'Generate Encryption Keys'}
        </button>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Remember this password — you will need it to decrypt confessions on new devices.
        </p>
      </div>
    </div>
  );
}

export default KeySetup;
