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
