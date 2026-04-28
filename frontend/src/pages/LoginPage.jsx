import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import LoginForm from '../components/auth/LoginForm';
import TwoFactorForm from '../components/auth/TwoFactorForm';
import SessionLimitForm from '../components/auth/SessionLimitForm';
import { login, verify2FA } from '../store/authSlice';
import { Shield } from 'lucide-react';

function LoginPage() {
  const { t } = useTranslation('auth');
  const [requires2FA, setRequires2FA] = useState(false);
  const [sessionLimitReached, setSessionLimitReached] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [userId, setUserId] = useState(null);
  const [is2FAConfirmed, setIs2FAConfirmed] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSessionLimit = (payload) => {
    setSessionLimitReached(true);
    setUserId(payload.user_id);
    setActiveSessions(payload.active_sessions);
  };

  const handleLogin = async (credentials) => {
    const result = await dispatch(login(credentials));
    if (login.fulfilled.match(result)) {
      if (result.payload.requires_2fa) {
        setRequires2FA(true);
        setUserId(result.payload.user_id);
        setIs2FAConfirmed(result.payload.is_2fa_confirmed);
      } else {
        navigate('/');
      }
    } else if (result.payload?.session_limit_reached) {
      handleSessionLimit(result.payload);
    }
  };

  const handleVerify2FA = async (token) => {
    const result = await dispatch(verify2FA({ user_id: userId, token }));
    if (verify2FA.fulfilled.match(result)) {
      navigate('/');
    } else if (result.payload?.session_limit_reached) {
      handleSessionLimit(result.payload);
    }
  };

  const handleSessionTerminationSuccess = (data) => {
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary-light items-center justify-center p-12">
        <div className="text-center text-white max-w-md">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
            <Shield size={40} />
          </div>
          <h1 className="text-3xl font-bold mb-4">
            {t('platform.title')}
          </h1>
          <p className="text-lg text-white/80">
            {t('platform.subtitle')}
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold">16</p>
              <p className="text-sm text-white/70">{t('platform.stat_confessions')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">E2E</p>
              <p className="text-sm text-white/70">{t('platform.stat_e2e')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">AI</p>
              <p className="text-sm text-white/70">{t('platform.stat_ai')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-primary-light rounded-xl flex items-center justify-center mx-auto mb-3">
              <Shield size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-text-primary">{t('platform.logo_text')}</h1>
          </div>

          <div className="card p-5 sm:p-8">
            <h2 className="text-xl font-bold text-text-primary mb-1">
              {sessionLimitReached
                ? t('login.session_limit_title')
                : requires2FA
                  ? t('login.twofa_title')
                  : t('login.title')}
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              {sessionLimitReached
                ? t('login.session_limit_message')
                : requires2FA
                  ? t('login.twofa_message')
                  : t('login.message')
              }
            </p>

            {error && (
              <div className="bg-red-50 text-danger p-3 rounded-lg mb-4 text-sm border border-red-100">
                {error}
              </div>
            )}

            {sessionLimitReached ? (
              <SessionLimitForm
                userId={userId}
                activeSessions={activeSessions}
                onSuccess={handleSessionTerminationSuccess}
                onBack={() => {
                  setSessionLimitReached(false);
                  setRequires2FA(false);
                }}
              />
            ) : requires2FA ? (
              <TwoFactorForm
                onSubmit={handleVerify2FA}
                loading={loading}
                onBack={() => setRequires2FA(false)}
                userId={userId}
                isFirstSetup={!is2FAConfirmed}
              />
            ) : (
              <LoginForm onSubmit={handleLogin} loading={loading} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
