import { useState, useRef, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, ArrowLeft, Mail, AlertTriangle } from 'lucide-react';
import authAPI from '../../api/authAPI';

function SessionLimitForm({ userId, activeSessions, onSuccess, onBack }) {
  const [step, setStep] = useState('select'); // 'select' | 'verify'
  const [selectedSession, setSelectedSession] = useState(null);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputsRef = useRef([]);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (step === 'verify') {
      inputsRef.current[0]?.focus();
    }
  }, [step]);

  const getDeviceIcon = (type) => {
    if (type === 'mobile') return <Smartphone size={20} className="text-text-secondary" />;
    if (type === 'tablet') return <Tablet size={20} className="text-text-secondary" />;
    return <Monitor size={20} className="text-text-secondary" />;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Hozir";
    if (diffMin < 60) return `${diffMin} daqiqa oldin`;
    if (diffHr < 24) return `${diffHr} soat oldin`;
    if (diffDay < 7) return `${diffDay} kun oldin`;
    return date.toLocaleDateString('uz-UZ');
  };

  const handleRequestCode = async () => {
    if (!selectedSession || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await authAPI.requestSessionTermination({
        user_id: userId,
        session_id: selectedSession,
      });
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.detail || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
      submittingRef.current = false;
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
      handleConfirm(newDigits.join(''));
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
      handleConfirm(pasted);
    }
  };

  const handleConfirm = async (code) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await authAPI.confirmSessionTermination({
        user_id: userId,
        code,
      });
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Noto'g'ri kod");
      setDigits(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleSubmitCode = (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length === 6) handleConfirm(code);
  };

  if (step === 'verify') {
    return (
      <form onSubmit={handleSubmitCode}>
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-primary-light/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Mail size={24} className="text-primary-light" />
          </div>
          <p className="text-sm text-text-secondary">
            Emailingizga 6 xonali tasdiqlash kodi yuborildi. Kodni kiriting.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-danger p-3 rounded-lg mb-4 text-sm border border-red-100">
            {error}
          </div>
        )}

        <div className="flex justify-center gap-1.5 sm:gap-2 mb-6" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-10 h-12 sm:w-11 sm:h-12 text-center text-lg font-bold border border-gray-200 rounded-lg focus:border-primary-light focus:ring-1 focus:ring-primary-light outline-none transition-colors"
              disabled={loading}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || digits.some((d) => d === '')}
          className="btn-primary w-full mb-3"
        >
          {loading ? "Tasdiqlanmoqda..." : "Tasdiqlash"}
        </button>

        <button
          type="button"
          onClick={() => {
            setStep('select');
            setDigits(['', '', '', '', '', '']);
            setError(null);
          }}
          className="w-full text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center gap-1"
        >
          <ArrowLeft size={14} />
          Orqaga
        </button>
      </form>
    );
  }

  return (
    <div>
      <div className="text-center mb-4">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={24} className="text-amber-600" />
        </div>
        <p className="text-sm text-text-secondary">
          Boshqa qurilmada aktiv sessiya mavjud. Davom etish uchun uni tanlang va tugatish kodini so'rang.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-danger p-3 rounded-lg mb-4 text-sm border border-red-100">
          {error}
        </div>
      )}

      <div className="space-y-2 mb-4">
        {activeSessions.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => setSelectedSession(session.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
              selectedSession === session.id
                ? 'bg-primary-light/5 border-primary-light'
                : 'bg-gray-50 border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
              {getDeviceIcon(session.device?.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {session.device?.model || session.device?.browser} — {session.device?.os || "Noma'lum OS"}
              </p>
              <p className="text-xs text-text-secondary truncate">
                {session.ip_address} · {formatDate(session.last_activity)}
              </p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
              selectedSession === session.id
                ? 'border-primary-light bg-primary-light'
                : 'border-gray-300'
            }`}>
              {selectedSession === session.id && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleRequestCode}
        disabled={!selectedSession || loading}
        className="btn-primary w-full mb-3"
      >
        {loading ? "Yuborilmoqda..." : "Tasdiqlash kodini yuborish"}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center gap-1"
      >
        <ArrowLeft size={14} />
        Orqaga
      </button>
    </div>
  );
}

export default SessionLimitForm;
