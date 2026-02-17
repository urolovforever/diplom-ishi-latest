import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkKeyStatus, uploadPublicKey } from '../../store/cryptoSlice';
import { generateKeyPair, storePrivateKey, hasStoredPrivateKey } from '../../utils/crypto';
import { Shield, Key } from 'lucide-react';

function KeySetup({ children, onComplete }) {
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <Key size={32} className="mx-auto mb-3 text-primary-light animate-pulse-dot" />
          <p className="text-text-secondary">Shifrlash kalitlari tekshirilmoqda...</p>
        </div>
      </div>
    );
  }

  if ((keyPairGenerated && hasLocalKey) || success) {
    return children || null;
  }

  const handleGenerate = async () => {
    setError(null);
    if (!password || password.length < 8) {
      setError("Parol kamida 8 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Parollar mos kelmaydi.");
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
      onComplete?.();
    } catch (err) {
      setError(err.message || "Kalit generatsiyasi muvaffaqiyatsiz tugadi.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface">
      <div className="card p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-light/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Shield size={28} className="text-primary-light" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">E2E shifrlash sozlamalari</h2>
          <p className="text-sm text-text-secondary mt-2">
            Konfessiyalaringizni himoya qilish uchun noyob shifrlash kaliti juftligini yaratishimiz kerak.
            Maxfiy kalitingiz parol bilan shifrlangan holda brauzeringizda saqlanadi.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-danger p-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Shifrlash paroli
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kamida 8 ta belgi"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Parolni tasdiqlash
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Parolni qayta kiriting"
              className="input-field"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Key size={18} />
            {generating ? 'Kalitlar yaratilmoqda...' : 'Shifrlash kalitlarini yaratish'}
          </button>

          <p className="text-xs text-text-secondary text-center">
            Bu parolni eslab qoling — yangi qurilmalarda konfessiyalarni ochish uchun kerak bo'ladi.
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeySetup;
