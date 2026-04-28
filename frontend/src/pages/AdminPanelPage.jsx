import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import authAPI from '../api/authAPI';
import StatCard from '../components/dashboard/StatCard';
import Skeleton from '../components/ui/Skeleton';
import {
  Users,
  LogIn,
  ShieldCheck,
  Globe,
  Activity,
  FileText,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  Lock,
  KeyRound,
  AlertTriangle,
  Download,
  Eye,
} from 'lucide-react';

function AdminPanelPage() {
  const { t } = useTranslation(['admin', 'common']);
  const TABS = [
    { key: 'active_users', label: t('tabs.active_users'), icon: Users },
    { key: 'login_history', label: t('tabs.login_history'), icon: LogIn },
    { key: 'security', label: t('tabs.security_status'), icon: ShieldCheck },
    { key: 'ip', label: t('tabs.ip_management'), icon: Globe },
    { key: 'top_users', label: t('tabs.top_users'), icon: Activity },
    { key: 'documents', label: t('tabs.document_stats'), icon: FileText },
  ];
  const [activeTab, setActiveTab] = useState('active_users');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // IP form state
  const [ipForm, setIpForm] = useState({ ip_address: '', list_type: 'blacklist', reason: '' });
  const [ipSubmitting, setIpSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authAPI.getAdminDashboard();
      setData(res.data);
    } catch {
      setError(t('errors.load_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteIP = async (id) => {
    try {
      await authAPI.deleteIPRestriction(id);
      fetchData();
    } catch {
      setError(t('errors.ip_delete_failed'));
    }
  };

  const handleAddIP = async (e) => {
    e.preventDefault();
    if (!ipForm.ip_address) return;
    try {
      setIpSubmitting(true);
      await authAPI.createIPRestriction(ipForm);
      setIpForm({ ip_address: '', list_type: 'blacklist', reason: '' });
      fetchData();
    } catch {
      setError(t('errors.ip_create_failed'));
    } finally {
      setIpSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <Skeleton className="w-24" />
              <Skeleton className="w-16" height="h-8" />
            </div>
          ))}
        </div>
        <div className="card p-5">
          <Skeleton className="w-full" height="h-[320px]" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card p-8 text-center">
        <AlertTriangle size={48} className="mx-auto text-danger mb-4" />
        <p className="text-text-secondary mb-4">{error}</p>
        <button onClick={fetchData} className="btn-primary px-4 py-2">
          {t('buttons.reload')}
        </button>
      </div>
    );
  }

  const secStatus = data?.security_status || {};
  const twoFaPercent = secStatus.total_users
    ? Math.round((secStatus.users_2fa_enabled / secStatus.total_users) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t('page.title')}</h1>
        <p className="text-sm text-text-secondary mt-1">{t('page.description')}</p>
      </div>

      {error && (
        <div className="bg-danger/10 text-danger px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-light/10 text-primary-light border-b-2 border-primary-light'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'active_users' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title={t('cards.online_users')} value={data?.active_users_count || 0} icon={Users} color="green" />
          </div>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            <h3 className="font-semibold text-text-primary">{t('sections.active_sessions')}</h3>
            {(data?.active_users || []).map((u, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-text-primary">{u.full_name}</div>
                    <div className="text-xs text-text-secondary">{u.email}</div>
                  </div>
                  <span className="badge-info">{u.role?.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span className="font-mono">{u.ip_address}</span>
                  <span>{new Date(u.last_activity).toLocaleString('uz')}</span>
                </div>
              </div>
            ))}
            {(!data?.active_users || data.active_users.length === 0) && (
              <div className="card p-8 text-center text-text-secondary text-sm">{t('empty.no_active_users')}</div>
            )}
          </div>

          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">{t('sections.active_sessions')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.user')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.role')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.ip')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.last_activity')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.active_users || []).map((u, i) => (
                    <tr key={i} className="hover:bg-surface-hover">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text-primary">{u.full_name}</div>
                        <div className="text-xs text-text-secondary">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge-info">{u.role?.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary font-mono text-xs">{u.ip_address}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {new Date(u.last_activity).toLocaleString('uz')}
                      </td>
                    </tr>
                  ))}
                  {(!data?.active_users || data.active_users.length === 0) && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-text-secondary">{t('empty.no_active_users')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'login_history' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title={t('cards.successful_24h')} value={data?.successful_logins_24h || 0} icon={CheckCircle} color="green" />
            <StatCard title={t('cards.failed_24h')} value={data?.failed_logins_24h || 0} icon={XCircle} color="red" />
          </div>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            <h3 className="font-semibold text-text-primary">{t('sections.last_50_logins')}</h3>
            {(data?.recent_logins || []).map((l, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-text-primary text-sm">{l.email}</span>
                  {l.success ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                      <CheckCircle size={12} /> {t('badges.ok')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-danger bg-danger/10 px-2 py-1 rounded-full">
                      <XCircle size={12} /> {t('badges.error')}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span className="font-mono">{l.ip_address}</span>
                  <span>{new Date(l.created_at).toLocaleString('uz')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">{t('sections.last_50_logins')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.email')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.ip')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.status')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.time')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.recent_logins || []).map((l, i) => (
                    <tr key={i} className="hover:bg-surface-hover">
                      <td className="px-4 py-3 text-text-primary">{l.email}</td>
                      <td className="px-4 py-3 text-text-secondary font-mono text-xs">{l.ip_address}</td>
                      <td className="px-4 py-3">
                        {l.success ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                            <CheckCircle size={12} /> {t('badges.success')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-danger bg-danger/10 px-2 py-1 rounded-full">
                            <XCircle size={12} /> {t('badges.fail')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {new Date(l.created_at).toLocaleString('uz')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title={t('cards.total_users')} value={secStatus.total_users} icon={Users} color="blue" />
            <StatCard title={t('cards.two_fa_enabled')} value={secStatus.users_2fa_enabled} icon={ShieldCheck} color="green" />
            <StatCard title={t('cards.two_fa_disabled')} value={secStatus.users_2fa_disabled} icon={XCircle} color="red" />
            <StatCard title={t('cards.password_expired')} value={secStatus.users_password_expired} icon={AlertTriangle} color="yellow" />
            <StatCard title={t('cards.locked')} value={secStatus.users_locked} icon={Lock} color="red" />
            <StatCard title={t('cards.e2e_keys')} value={secStatus.e2e_keys_setup} icon={KeyRound} color="purple" />
          </div>

          {/* 2FA Progress */}
          <div className="card p-5">
            <h3 className="font-semibold text-text-primary mb-3">{t('sections.two_fa_coverage')}</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-surface-secondary rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-primary-light rounded-full transition-all duration-500"
                  style={{ width: `${twoFaPercent}%` }}
                />
              </div>
              <span className="text-lg font-bold text-text-primary">{twoFaPercent}%</span>
            </div>
            <p className="text-xs text-text-secondary mt-2">
              {t('sections.two_fa_coverage_info', { enabled: secStatus.users_2fa_enabled, total: secStatus.total_users })}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'ip' && (
        <div className="space-y-4">
          {/* Add IP form */}
          <div className="card p-5">
            <h3 className="font-semibold text-text-primary mb-3">{t('sections.add_ip_restriction')}</h3>
            <form onSubmit={handleAddIP} className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
              <div>
                <label className="block text-xs text-text-secondary mb-1">{t('form.ip_address')}</label>
                <input
                  type="text"
                  value={ipForm.ip_address}
                  onChange={(e) => setIpForm({ ...ipForm, ip_address: e.target.value })}
                  placeholder="192.168.1.1"
                  className="input-field w-full sm:w-48"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">{t('form.list_type')}</label>
                <select
                  value={ipForm.list_type}
                  onChange={(e) => setIpForm({ ...ipForm, list_type: e.target.value })}
                  className="input-field w-full sm:w-36"
                >
                  <option value="blacklist">{t('filters.blacklist')}</option>
                  <option value="whitelist">{t('filters.whitelist')}</option>
                </select>
              </div>
              <div className="flex-1 min-w-0 sm:min-w-[200px]">
                <label className="block text-xs text-text-secondary mb-1">{t('form.reason')}</label>
                <input
                  type="text"
                  value={ipForm.reason}
                  onChange={(e) => setIpForm({ ...ipForm, reason: e.target.value })}
                  placeholder={t('form.reason_placeholder')}
                  className="input-field w-full"
                />
              </div>
              <button
                type="submit"
                disabled={ipSubmitting}
                className="btn-primary px-4 py-2 flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                {ipSubmitting ? t('buttons.adding_ip') : t('buttons.add_ip')}
              </button>
            </form>
          </div>

          {/* IP restrictions - Mobile card view */}
          <div className="space-y-3 md:hidden">
            <h3 className="font-semibold text-text-primary">{t('sections.ip_restrictions_list')}</h3>
            {(data?.ip_restrictions || []).map((r) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-text-primary">{r.ip_address}</span>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                      r.list_type === 'blacklist' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                    }`}>
                      {r.list_type}
                    </span>
                    <button onClick={() => handleDeleteIP(r.id)} className="text-danger hover:text-danger/80 p-1" title={t('common:actions.delete')}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-text-secondary space-y-0.5">
                  {r.reason && <div>{t('info.ip_reason', { reason: r.reason })}</div>}
                  <div className="flex justify-between">
                    <span>{r.created_by_email || '-'}</span>
                    <span>{new Date(r.created_at).toLocaleDateString('uz')}</span>
                  </div>
                </div>
              </div>
            ))}
            {(!data?.ip_restrictions || data.ip_restrictions.length === 0) && (
              <div className="card p-8 text-center text-text-secondary text-sm">{t('empty.no_ip_restrictions')}</div>
            )}
          </div>

          {/* IP restrictions - Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">{t('sections.ip_restrictions_list')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.ip')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('form.list_type')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.reason')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.created_by')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.date')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.ip_restrictions || []).map((r) => (
                    <tr key={r.id} className="hover:bg-surface-hover">
                      <td className="px-4 py-3 font-mono text-xs text-text-primary">{r.ip_address}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                          r.list_type === 'blacklist'
                            ? 'bg-danger/10 text-danger'
                            : 'bg-success/10 text-success'
                        }`}>
                          {r.list_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{r.reason || '-'}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{r.created_by_email || '-'}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {new Date(r.created_at).toLocaleDateString('uz')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteIP(r.id)}
                          className="text-danger hover:text-danger/80 p-1"
                          title={t('common:actions.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!data?.ip_restrictions || data.ip_restrictions.length === 0) && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">{t('empty.no_ip_restrictions')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'top_users' && (
        <div className="space-y-4">
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            <h3 className="font-semibold text-text-primary">{t('sections.top_users_24h')}</h3>
            {(data?.top_users || []).map((u, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-secondary w-5">#{i + 1}</span>
                    <div>
                      <div className="font-medium text-text-primary text-sm">{u.full_name}</div>
                      <div className="text-xs text-text-secondary">{u.email}</div>
                    </div>
                  </div>
                  <span className="badge-info">{u.role?.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span><strong className="text-text-primary">{u.requests_count}</strong> so'rov</span>
                  <span className="inline-flex items-center gap-1"><Download size={12} /> {u.docs_downloaded}</span>
                  <span className={u.errors_count > 0 ? 'text-danger font-medium' : ''}>{u.errors_count} xato</span>
                </div>
              </div>
            ))}
            {(!data?.top_users || data.top_users.length === 0) && (
              <div className="card p-8 text-center text-text-secondary text-sm">{t('empty.no_data')}</div>
            )}
          </div>

          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">{t('sections.top_users_24h')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">#</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.user')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.role')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('columns.requests')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('columns.downloads')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('columns.errors')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.top_users || []).map((u, i) => (
                    <tr key={i} className="hover:bg-surface-hover">
                      <td className="px-4 py-3 text-text-secondary font-medium">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text-primary">{u.full_name}</div>
                        <div className="text-xs text-text-secondary">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge-info">{u.role?.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3 text-text-primary font-semibold">{u.requests_count}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-text-secondary">
                          <Download size={14} /> {u.docs_downloaded}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${u.errors_count > 0 ? 'text-danger' : 'text-text-secondary'}`}>
                          {u.errors_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!data?.top_users || data.top_users.length === 0) && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">{t('empty.no_data')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title={t('cards.total_documents')} value={data?.document_stats?.total_documents || 0} icon={FileText} color="blue" />
            <StatCard title={t('cards.e2e_encrypted')} value={data?.document_stats?.e2e_encrypted_count || 0} icon={KeyRound} color="purple" />
            <StatCard title={t('cards.secret')} value={data?.document_stats?.by_security_level?.secret || 0} icon={Lock} color="red" />
            <StatCard title={t('cards.confidential')} value={data?.document_stats?.by_security_level?.confidential || 0} icon={ShieldCheck} color="yellow" />
          </div>

          {/* Security level breakdown */}
          <div className="card p-5">
            <h3 className="font-semibold text-text-primary mb-4">{t('sections.by_security_level')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {['public', 'internal', 'confidential', 'secret'].map((level) => {
                const count = data?.document_stats?.by_security_level?.[level] || 0;
                const total = data?.document_stats?.total_documents || 1;
                const percent = Math.round((count / total) * 100);
                const colors = {
                  public: 'bg-success',
                  internal: 'bg-primary-light',
                  confidential: 'bg-warning',
                  secret: 'bg-danger',
                };
                return (
                  <div key={level} className="text-center">
                    <div className="text-2xl font-bold text-text-primary">{count}</div>
                    <div className="text-xs text-text-secondary capitalize mb-2">{level}</div>
                    <div className="bg-surface-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[level]}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Most accessed documents - Mobile card view */}
          <div className="space-y-3 md:hidden">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Eye size={18} /> {t('sections.most_accessed_documents')}
            </h3>
            {(data?.document_stats?.most_accessed || []).map((d, i) => (
              <div key={i} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-text-secondary w-5">#{i + 1}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-text-primary text-sm truncate">{d.title}</div>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${
                      d.security_level === 'secret' ? 'bg-danger/10 text-danger' :
                      d.security_level === 'confidential' ? 'bg-warning/10 text-warning' :
                      d.security_level === 'internal' ? 'bg-primary-light/10 text-primary-light' :
                      'bg-success/10 text-success'
                    }`}>
                      {d.security_level}
                    </span>
                  </div>
                </div>
                <span className="font-semibold text-text-primary text-lg flex-shrink-0 ml-2">{d.access_count}</span>
              </div>
            ))}
            {(!data?.document_stats?.most_accessed || data.document_stats.most_accessed.length === 0) && (
              <div className="card p-8 text-center text-text-secondary text-sm">{t('empty.no_data')}</div>
            )}
          </div>

          {/* Most accessed documents - Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Eye size={18} /> Eng ko'p ko'rilgan hujjatlar
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">#</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.document')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('columns.level')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('columns.views')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.document_stats?.most_accessed || []).map((d, i) => (
                    <tr key={i} className="hover:bg-surface-hover">
                      <td className="px-4 py-3 text-text-secondary">{i + 1}</td>
                      <td className="px-4 py-3 text-text-primary font-medium">{d.title}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                          d.security_level === 'secret' ? 'bg-danger/10 text-danger' :
                          d.security_level === 'confidential' ? 'bg-warning/10 text-warning' :
                          d.security_level === 'internal' ? 'bg-primary-light/10 text-primary-light' :
                          'bg-success/10 text-success'
                        }`}>
                          {d.security_level}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-text-primary">{d.access_count}</td>
                    </tr>
                  ))}
                  {(!data?.document_stats?.most_accessed || data.document_stats.most_accessed.length === 0) && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-text-secondary">{t('empty.no_data')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent downloads - Mobile card view */}
          <div className="space-y-3 md:hidden">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Download size={18} /> {t('sections.recent_downloads')}
            </h3>
            {(data?.document_stats?.recent_downloads || []).map((d, i) => (
              <div key={i} className="card p-4">
                <div className="font-medium text-text-primary text-sm mb-1">{d.document_title}</div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                  <span>{d.user_email || '-'}</span>
                  <span className="font-mono">{d.ip_address || '-'}</span>
                  <span>{new Date(d.created_at).toLocaleString('uz')}</span>
                </div>
              </div>
            ))}
            {(!data?.document_stats?.recent_downloads || data.document_stats.recent_downloads.length === 0) && (
              <div className="card p-8 text-center text-text-secondary text-sm">{t('empty.no_downloads')}</div>
            )}
          </div>

          {/* Recent downloads - Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Download size={18} /> So'nggi yuklab olishlar
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.document')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.user')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.ip')}</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">{t('table.time')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.document_stats?.recent_downloads || []).map((d, i) => (
                    <tr key={i} className="hover:bg-surface-hover">
                      <td className="px-4 py-3 text-text-primary font-medium">{d.document_title}</td>
                      <td className="px-4 py-3 text-text-secondary">{d.user_email || '-'}</td>
                      <td className="px-4 py-3 text-text-secondary font-mono text-xs">{d.ip_address || '-'}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {new Date(d.created_at).toLocaleString('uz')}
                      </td>
                    </tr>
                  ))}
                  {(!data?.document_stats?.recent_downloads || data.document_stats.recent_downloads.length === 0) && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-text-secondary">{t('empty.no_downloads')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanelPage;
