import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import authAPI from '../api/authAPI';
import FormField from '../components/ui/FormField';
import { passwordStrength } from '../utils/validation';
import { Lock, CheckCircle } from 'lucide-react';

function PasswordResetConfirmPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    const pwErr = passwordStrength(password);
    if (pwErr) errs.password = pwErr;
    if (password !== confirmPassword) errs.confirm = "Parollar mos kelmaydi";
    if (!token) errs.token = "Tiklash tokeni topilmadi";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      await authAPI.confirmPasswordReset({ token, new_password: password });
      setSuccess(true);
      setServerError('');
    } catch (err) {
      setServerError(err.response?.data?.detail || "Parolni tiklashda xatolik");
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="card max-w-md w-full p-8 text-center mx-4">
          <CheckCircle size={48} className="mx-auto mb-4 text-success" />
          <h1 className="text-xl font-bold text-text-primary mb-2">Parol tiklandi</h1>
          <p className="text-text-secondary mb-6">Parolingiz muvaffaqiyatli o'zgartirildi.</p>
          <Link to="/login" className="btn-primary inline-flex items-center gap-2">
            Tizimga kirish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="card max-w-md w-full p-8 mx-4">
        <h1 className="text-xl font-bold text-text-primary mb-1">Yangi parol o'rnatish</h1>
        <p className="text-sm text-text-secondary mb-6">Yangi parolingizni kiriting</p>
        {serverError && (
          <div className="bg-red-50 border border-red-100 text-danger p-3 rounded-xl mb-4 text-sm">{serverError}</div>
        )}
        {errors.token && (
          <div className="bg-red-50 border border-red-100 text-danger p-3 rounded-xl mb-4 text-sm">{errors.token}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Yangi parol" error={errors.password} id="new-password">
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pl-10" />
            </div>
          </FormField>
          <FormField label="Parolni tasdiqlash" error={errors.confirm} id="confirm-password">
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field pl-10" />
            </div>
          </FormField>
          <button type="submit" className="btn-primary w-full">Parolni tiklash</button>
        </form>
      </div>
    </div>
  );
}

export default PasswordResetConfirmPage;
