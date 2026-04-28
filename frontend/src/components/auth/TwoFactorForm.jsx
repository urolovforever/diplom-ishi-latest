import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import authAPI from '../../api/authAPI';

function TwoFactorForm({ onSubmit, loading, onBack, userId, isFirstSetup }) {
  const { t } = useTranslation('auth');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loadingQR, setLoadingQR] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const inputsRef = useRef([]);

  useEffect(() => {
    // Auto-load QR code on first setup
    if (isFirstSetup) {
      loadQRCode();
    }
  }, [isFirstSetup]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const loadQRCode = async () => {
    setLoadingQR(true);
    try {
      const res = await authAPI.get2FASetup(userId);
      setQrCode(res.data.qr_code);
      setSecret(res.data.secret);
    } catch {
      // silently fail
    } finally {
      setLoadingQR(false);
    }
  };

  const handleShowQR = async () => {
    if (qrCode) {
      setShowQR(!showQR);
      return;
    }
    await loadQRCode();
    setShowQR(true);
  };

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== '') && index === 5) {
      onSubmit(newDigits.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputsRef.current[5]?.focus();
      onSubmit(pasted);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length === 6) onSubmit(code);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* QR Code Section - only shown during first-time setup */}
      {isFirstSetup && (
        <>
          <div className="text-center mb-4">
            {loadingQR ? (
              <p className="text-sm text-text-secondary">{t('twofa.loading')}</p>
            ) : !showQR ? (
              <button
                type="button"
                onClick={handleShowQR}
                className="text-sm text-primary-light hover:text-primary font-medium transition-colors"
              >
                {t('twofa.show_qr')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowQR(false)}
                className="text-sm text-primary-light hover:text-primary font-medium transition-colors"
              >
                {t('twofa.hide_qr')}
              </button>
            )}
          </div>

          {showQR && qrCode && (
            <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-text-secondary text-center mb-3">
                {t('twofa.scan_qr')}
              </p>
              <div className="flex justify-center mb-3">
                <img src={qrCode} alt="2FA QR Code" className="rounded-lg" />
              </div>
              {secret && (
                <div className="mt-2">
                  <p className="text-xs text-text-secondary text-center mb-1">
                    {t('twofa.manual_entry')}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 font-mono select-all break-all">
                      {secret}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-1 text-text-secondary hover:text-primary-light transition-colors"
                      title={t('twofa.copy_secret')}
                    >
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Code Input */}
      <div className="flex justify-center gap-1.5 sm:gap-2.5 mb-6" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light/30 focus:border-primary-light transition-all"
          />
        ))}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full mb-3">
        {loading ? t('twofa.verify_loading') : t('twofa.verify_button')}
      </button>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-full flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors py-2"
        >
          <ArrowLeft size={16} />
          {t('twofa.back_button')}
        </button>
      )}
    </form>
  );
}

export default TwoFactorForm;
