import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { checkKeyStatus, uploadPublicKey } from '../../store/cryptoSlice';
import { generateKeyPair, storePrivateKey } from '../../utils/crypto';
import PasswordInput from '../ui/PasswordInput';
import { Shield, Key } from 'lucide-react';

function KeySetup({ children, onComplete }) {
  const { t } = useTranslation('auth');
  const dispatch = useDispatch();
  const { keyPairGenerated, loading } = useSelector((state) => state.crypto);
  const { token } = useSelector((state) => state.auth);
  const [generating, setGenerating] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (token) {
      dispatch(checkKeyStatus()).then(() => setChecked(true)).catch(() => setChecked(true));
    }
  }, [dispatch, token]);

  if (!checked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <Key size={32} className="mx-auto mb-3 text-primary-light animate-pulse-dot" />
          <p className="text-text-secondary">{t('keysetup.checking')}</p>
        </div>
      </div>
    );
  }

  if (keyPairGenerated || success) {
    return children || null;
  }

  const handleGenerate = async () => {
    setError(null);
    if (!password || password.length < 12) {
      setError(t('keysetup.errors.min_length'));
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError(t('keysetup.errors.uppercase'));
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError(t('keysetup.errors.lowercase'));
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError(t('keysetup.errors.number'));
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError(t('keysetup.errors.special_char'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('keysetup.errors.mismatch'));
      return;
    }

    setGenerating(true);
    try {
      const { publicKeyJwk, privateKeyJwk } = await generateKeyPair();
      const encryptedData = await storePrivateKey(privateKeyJwk, password);

      await dispatch(
        uploadPublicKey({
          public_key: JSON.stringify(publicKeyJwk),
          encrypted_private_key: JSON.stringify(encryptedData),
        })
      ).unwrap();

      setSuccess(true);
      onComplete?.();
    } catch (err) {
      setError(err.message || t('keysetup.errors.min_length'));
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
          <h2 className="text-xl font-bold text-text-primary">{t('keysetup.title')}</h2>
          <p className="text-sm text-text-secondary mt-2">
            {t('keysetup.description')}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-danger p-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        <div className="space-y-4">
          <PasswordInput
            value={password}
            onChange={setPassword}
            label={t('keysetup.password_label')}
            id="encryption-password"
            placeholder={t('keysetup.password_placeholder')}
            showGenerator={true}
            showRequirements={true}
          />

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('keysetup.confirm_password_label')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('keysetup.confirm_password_placeholder')}
              className="input-field"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Key size={18} />
            {generating ? t('keysetup.generate_loading') : t('keysetup.generate_button')}
          </button>

          <p className="text-xs text-text-secondary text-center">
            {t('keysetup.password_reminder')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeySetup;
