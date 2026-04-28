import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import authAPI from '../api/authAPI';
import { addToast } from '../store/uiSlice';
import { Lock, Settings, Mail, CheckCircle, Monitor, Smartphone, Tablet, Globe } from 'lucide-react';

function SettingsPage() {
  const { t } = useTranslation('settings');
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await authAPI.getSessions();
      setSessions(res.data);
    } catch {
      dispatch(addToast({ type: 'error', message: t('errors.sessions_load_failed') }));
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRequestPasswordChange = async () => {
    setLoading(true);
    try {
      await authAPI.requestPasswordReset(user.email);
      setSent(true);
      dispatch(addToast({ type: 'success', message: t('toasts.link_sent') }));
    } catch {
      dispatch(addToast({ type: 'error', message: t('errors.request_failed') }));
    } finally {
      setLoading(false);
    }
  };

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

    if (diffMin < 1) return t('time.just_now');
    if (diffMin < 60) return t('time.minutes_ago', { count: diffMin });
    if (diffHr < 24) return t('time.hours_ago', { count: diffHr });
    if (diffDay < 7) return t('time.days_ago', { count: diffDay });
    return date.toLocaleDateString('uz-UZ');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Settings size={24} className="text-primary-light" />
          {t('page.title')}
        </h1>
        <p className="text-sm text-text-secondary mt-1">{t('page.description')}</p>
      </div>

      {/* Password Change */}
      <div className="card p-6 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Lock size={16} className="text-primary-light" />
          {t('sections.password_change')}
        </h3>

        {sent ? (
          <div className="text-center py-4">
            <CheckCircle size={40} className="mx-auto mb-3 text-green-500" />
            <p className="text-sm text-text-primary font-medium mb-1">{t('success.link_sent')}</p>
            <p className="text-xs text-text-secondary mb-4">
              {t('success.check_email')}
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-sm text-primary-light hover:text-primary font-medium transition-colors"
            >
              {t('buttons.resend_link')}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-text-secondary mb-4">
              {t('info.password_reset_message')}
            </p>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
              <Mail size={18} className="text-text-secondary flex-shrink-0" />
              <span className="text-sm text-text-primary">{user?.email}</span>
            </div>
            <button
              onClick={handleRequestPasswordChange}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <Mail size={16} />
              {loading ? t('buttons.sending') : t('buttons.send_link')}
            </button>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Globe size={16} className="text-primary-light" />
            {t('sections.sessions_title')}
          </h3>
          <span className="text-xs text-text-secondary bg-gray-100 px-2 py-0.5 rounded-full">
            {t('badges.max_sessions')}
          </span>
        </div>
        <p className="text-xs text-text-secondary mb-4">
          {t('info.session_limit')}
        </p>

        {sessionsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-2 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-4">{t('empty.no_sessions')}</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  session.is_current
                    ? 'bg-primary-light/5 border-primary-light/20'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                  {getDeviceIcon(session.device?.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {session.device?.model || session.device?.browser} — {session.device?.os || "Noma'lum OS"}
                    </p>
                    {session.is_current && (
                      <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex-shrink-0">
                        {t('badges.active')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary truncate">
                    {session.ip_address} · {formatDate(session.last_activity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
