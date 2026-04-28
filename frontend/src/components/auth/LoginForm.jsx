import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

function LoginForm({ onSubmit, loading }) {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {t('form.email_label')}
        </label>
        <div className="relative">
          <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field pl-10"
            placeholder={t('form.email_placeholder')}
            required
          />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {t('form.password_label')}
        </label>
        <div className="relative">
          <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field pl-10 pr-10"
            placeholder={t('form.password_placeholder')}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div className="flex justify-end mb-6">
        <a href="/password-reset" className="text-sm text-primary-light hover:text-primary transition-colors">
          {t('form.forgot_password')}
        </a>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? t('form.login_button_loading') : t('form.login_button')}
      </button>
    </form>
  );
}

export default LoginForm;
