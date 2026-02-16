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
      </div>
    </div>
  );
}

export default KeySetup;
