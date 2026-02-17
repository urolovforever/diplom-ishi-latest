import { useState } from 'react';
import { Link } from 'react-router-dom';
import authAPI from '../api/authAPI';
import FormField from '../components/ui/FormField';
import { required, email as emailValidator } from '../utils/validation';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

function PasswordResetRequestPage() {
  const [emailValue, setEmailValue] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = required(emailValue) || emailValidator(emailValue);
    if (err) { setError(err); return; }
    try {
      await authAPI.requestPasswordReset(emailValue);
    } catch {
      // Always show success to prevent email enumeration
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="card max-w-md w-full p-8 text-center mx-4">
          <CheckCircle size={48} className="mx-auto mb-4 text-success" />
          <h1 className="text-xl font-bold text-text-primary mb-2">Emailingizni tekshiring</h1>
          <p className="text-text-secondary mb-6">
            Agar bunday email bilan hisob mavjud bo'lsa, parolni tiklash havolasini yubordik.
          </p>
          <Link to="/login" className="text-primary-light hover:text-primary font-medium transition-colors">
            Kirish sahifasiga qaytish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="card max-w-md w-full p-8 mx-4">
        <h1 className="text-xl font-bold text-text-primary mb-1">Parolni tiklash</h1>
        <p className="text-sm text-text-secondary mb-6">Email manzilingizni kiriting va biz sizga tiklash havolasini yuboramiz</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Email" error={error} id="reset-email">
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                id="reset-email"
                type="email"
                value={emailValue}
                onChange={(e) => { setEmailValue(e.target.value); setError(''); }}
                className="input-field pl-10"
                placeholder="email@example.com"
              />
            </div>
          </FormField>
          <button type="submit" className="btn-primary w-full">
            Tiklash havolasini yuborish
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="text-primary-light hover:text-primary font-medium flex items-center justify-center gap-1 transition-colors">
            <ArrowLeft size={16} />
            Kirish sahifasiga qaytish
          </Link>
        </p>
      </div>
    </div>
  );
}

export default PasswordResetRequestPage;
