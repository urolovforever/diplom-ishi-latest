import { useState, useEffect } from 'react';
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

const TABS = [
  { key: 'active_users', label: 'Faol foydalanuvchilar', icon: Users },
  { key: 'login_history', label: 'Login tarixi', icon: LogIn },
  { key: 'security', label: 'Xavfsizlik holati', icon: ShieldCheck },
  { key: 'ip', label: 'IP boshqaruvi', icon: Globe },
  { key: 'top_users', label: 'Eng faol userlar', icon: Activity },
  { key: 'documents', label: 'Hujjat statistikasi', icon: FileText },
];

function AdminPanelPage() {
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
      setError("Ma'lumotlarni yuklashda xatolik yuz berdi.");
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
      setError("IP cheklovni o'chirishda xatolik.");
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
      setError("IP cheklov qo'shishda xatolik.");
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
          Qayta yuklash
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
        <h1 className="text-2xl font-bold text-text-primary">Admin Panel</h1>
        <p className="text-sm text-text-secondary mt-1">Platformaning umumiy xavfsizlik holati</p>
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
            <StatCard title="Onlayn foydalanuvchilar" value={data?.active_users_count || 0} icon={Users} color="green" />
          </div>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            <h3 className="font-semibold text-text-primary">Faol sessiyalar (30 daqiqa ichida)</h3>
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
              <div className="card p-8 text-center text-text-secondary text-sm">Hozirda faol foydalanuvchi yo'q</div>
            )}
          </div>

          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">Faol sessiyalar (30 daqiqa ichida)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Foydalanuvchi</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">IP</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Oxirgi faoliyat</th>
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
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-text-secondary">Hozirda faol foydalanuvchi yo'q</td></tr>
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
            <StatCard title="Muvaffaqiyatli (24s)" value={data?.successful_logins_24h || 0} icon={CheckCircle} color="green" />
            <StatCard title="Muvaffaqiyatsiz (24s)" value={data?.failed_logins_24h || 0} icon={XCircle} color="red" />
          </div>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            <h3 className="font-semibold text-text-primary">Oxirgi 50 ta login urinish</h3>
            {(data?.recent_logins || []).map((l, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-text-primary text-sm">{l.email}</span>
                  {l.success ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                      <CheckCircle size={12} /> OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-danger bg-danger/10 px-2 py-1 rounded-full">
                      <XCircle size={12} /> Xato
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
              <h3 className="font-semibold text-text-primary">Oxirgi 50 ta login urinish</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">IP</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Holat</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Vaqt</th>
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
                            <CheckCircle size={12} /> Muvaffaqiyatli
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-danger bg-danger/10 px-2 py-1 rounded-full">
                            <XCircle size={12} /> Muvaffaqiyatsiz
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
            <StatCard title="Jami foydalanuvchilar" value={secStatus.total_users} icon={Users} color="blue" />
            <StatCard title="2FA yoqilgan" value={secStatus.users_2fa_enabled} icon={ShieldCheck} color="green" />
            <StatCard title="2FA o'chirilgan" value={secStatus.users_2fa_disabled} icon={XCircle} color="red" />
            <StatCard title="Parol muddati tugagan" value={secStatus.users_password_expired} icon={AlertTriangle} color="yellow" />
            <StatCard title="Bloklangan" value={secStatus.users_locked} icon={Lock} color="red" />
            <StatCard title="E2E kalitlar" value={secStatus.e2e_keys_setup} icon={KeyRound} color="purple" />
          </div>

          {/* 2FA Progress */}
          <div className="card p-5">
            <h3 className="font-semibold text-text-primary mb-3">2FA qamrov darajasi</h3>
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
              {secStatus.users_2fa_enabled} / {secStatus.total_users} foydalanuvchi 2FA yoqilgan
            </p>
          </div>
        </div>
      )}

      {activeTab === 'ip' && (
        <div className="space-y-4">
          {/* Add IP form */}
          <div className="card p-5">
            <h3 className="font-semibold text-text-primary mb-3">Yangi IP cheklov qo'shish</h3>
            <form onSubmit={handleAddIP} className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
              <div>
                <label className="block text-xs text-text-secondary mb-1">IP manzil</label>
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
                <label className="block text-xs text-text-secondary mb-1">Turi</label>
                <select
                  value={ipForm.list_type}
                  onChange={(e) => setIpForm({ ...ipForm, list_type: e.target.value })}
                  className="input-field w-full sm:w-36"
                >
                  <option value="blacklist">Blacklist</option>
                  <option value="whitelist">Whitelist</option>
                </select>
              </div>
              <div className="flex-1 min-w-0 sm:min-w-[200px]">
                <label className="block text-xs text-text-secondary mb-1">Sabab</label>
                <input
                  type="text"
                  value={ipForm.reason}
                  onChange={(e) => setIpForm({ ...ipForm, reason: e.target.value })}
                  placeholder="Ixtiyoriy sabab..."
                  className="input-field w-full"
                />
              </div>
              <button
                type="submit"
                disabled={ipSubmitting}
                className="btn-primary px-4 py-2 flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                {ipSubmitting ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
              </button>
            </form>
          </div>

          {/* IP restrictions - Mobile card view */}
          <div className="space-y-3 md:hidden">
            <h3 className="font-semibold text-text-primary">IP cheklovlar ro'yxati</h3>
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
                    <button onClick={() => handleDeleteIP(r.id)} className="text-danger hover:text-danger/80 p-1" title="O'chirish">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-text-secondary space-y-0.5">
                  {r.reason && <div>Sabab: {r.reason}</div>}
                  <div className="flex justify-between">
                    <span>{r.created_by_email || '-'}</span>
                    <span>{new Date(r.created_at).toLocaleDateString('uz')}</span>
                  </div>
                </div>
              </div>
            ))}
            {(!data?.ip_restrictions || data.ip_restrictions.length === 0) && (
              <div className="card p-8 text-center text-text-secondary text-sm">IP cheklovlar yo'q</div>
            )}
          </div>

          {/* IP restrictions - Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">IP cheklovlar ro'yxati</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">IP</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Turi</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Sabab</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Yaratgan</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Sana</th>
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
                          title="O'chirish"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!data?.ip_restrictions || data.ip_restrictions.length === 0) && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">IP cheklovlar yo'q</td></tr>
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
            <h3 className="font-semibold text-text-primary">Eng faol foydalanuvchilar (24 soat)</h3>
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
              <div className="card p-8 text-center text-text-secondary text-sm">Ma'lumot yo'q</div>
            )}
          </div>

          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">Eng faol foydalanuvchilar (24 soat)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">#</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Foydalanuvchi</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">So'rovlar</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Yuklab olishlar</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Xatoliklar</th>
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
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">Ma'lumot yo'q</td></tr>
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
            <StatCard title="Jami hujjatlar" value={data?.document_stats?.total_documents || 0} icon={FileText} color="blue" />
            <StatCard title="E2E shifrlangan" value={data?.document_stats?.e2e_encrypted_count || 0} icon={KeyRound} color="purple" />
            <StatCard title="Maxfiy (secret)" value={data?.document_stats?.by_security_level?.secret || 0} icon={Lock} color="red" />
            <StatCard title="Konfidensial" value={data?.document_stats?.by_security_level?.confidential || 0} icon={ShieldCheck} color="yellow" />
          </div>

          {/* Security level breakdown */}
          <div className="card p-5">
            <h3 className="font-semibold text-text-primary mb-4">Xavfsizlik darajasi bo'yicha</h3>
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
              <Eye size={18} /> Eng ko'p ko'rilgan hujjatlar
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
              <div className="card p-8 text-center text-text-secondary text-sm">Ma'lumot yo'q</div>
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
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Hujjat</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Daraja</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Ko'rishlar</th>
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
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-text-secondary">Ma'lumot yo'q</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent downloads - Mobile card view */}
          <div className="space-y-3 md:hidden">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Download size={18} /> So'nggi yuklab olishlar
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
              <div className="card p-8 text-center text-text-secondary text-sm">Yuklab olishlar yo'q</div>
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
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Hujjat</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Foydalanuvchi</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">IP</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Vaqt</th>
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
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-text-secondary">Yuklab olishlar yo'q</td></tr>
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
