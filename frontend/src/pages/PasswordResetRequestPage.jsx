import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authAPI from '../api/authAPI';
import FormField from '../components/ui/FormField';
import { required, email as emailValidator } from '../utils/validation';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

function PasswordResetRequestPage() {
  const { t } = useTranslation('auth');
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
          <h1 className="text-xl font-bold text-text-primary mb-2">{t('password_reset.success_title')}</h1>
          <p className="text-text-secondary mb-6">
            {t('password_reset.success_message')}
          </p>
          <Link to="/login" className="text-primary-light hover:text-primary font-medium transition-colors">
            {t('password_reset.back_to_login')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="card max-w-md w-full p-8 mx-4">
        <h1 className="text-xl font-bold text-text-primary mb-1">{t('password_reset.title')}</h1>
        <p className="text-sm text-text-secondary mb-6">{t('password_reset.description')}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label={t('password_reset.email_label')} error={error} id="reset-email">
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                id="reset-email"
                type="email"
                value={emailValue}
                onChange={(e) => { setEmailValue(e.target.value); setError(''); }}
                className="input-field pl-10"
                placeholder={t('password_reset.email_placeholder')}
              />
            </div>
          </FormField>
          <button type="submit" className="btn-primary w-full">
            {t('password_reset.submit_button')}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="text-primary-light hover:text-primary font-medium flex items-center justify-center gap-1 transition-colors">
            <ArrowLeft size={16} />
            {t('password_reset.back_to_login')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default PasswordResetRequestPage;
