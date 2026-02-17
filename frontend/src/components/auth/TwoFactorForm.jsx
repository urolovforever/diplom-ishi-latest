import { useState, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

function TwoFactorForm({ onSubmit, loading, onBack }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

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

  const handleResend = () => {
    setCountdown(60);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length === 6) onSubmit(code);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex justify-center gap-2.5 mb-6" onPaste={handlePaste}>
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
            className="w-12 h-14 text-center text-xl font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light/30 focus:border-primary-light transition-all"
          />
        ))}
      </div>

      <div className="text-center mb-6">
        {countdown > 0 ? (
          <p className="text-sm text-text-secondary">
            Qayta yuborish: <span className="font-medium text-text-primary">{countdown}s</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="text-sm text-primary-light hover:text-primary font-medium transition-colors"
          >
            Kodni qayta yuborish
          </button>
        )}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full mb-3">
        {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
      </button>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-full flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors py-2"
        >
          <ArrowLeft size={16} />
          Orqaga qaytish
        </button>
      )}
    </form>
  );
}

export default TwoFactorForm;
