import { useState, useEffect } from 'react';
import authAPI from '../api/authAPI';
import Skeleton from '../components/ui/Skeleton';
import { Settings, MessageSquare, Bell, Shield, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const TABS = [
  { id: 'telegram', label: 'Telegram', icon: MessageSquare },
  { id: 'alerts', label: 'Ogohlantirishlar', icon: Bell },
];

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('telegram');
  const [telegramConfig, setTelegramConfig] = useState({ chat_id: '', alert_types: [] });
  const [alertRules, setAlertRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [newRule, setNewRule] = useState({
    name: '',
    condition_type: 'anomaly_count',
    threshold: 5,
    action: 'all',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesRes] = await Promise.all([
        authAPI.getAlertRules().catch(() => ({ data: { results: [] } })),
      ]);
      setAlertRules(rulesRes.data.results || rulesRes.data || []);
      try {
        const tgRes = await authAPI.getTelegramConfig();
        setTelegramConfig(tgRes.data);
      } catch {
        // Not configured yet
      }
    } catch {
      setError("Sozlamalarni yuklashda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramSave = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await authAPI.updateTelegramConfig(telegramConfig);
      setSuccess("Telegram konfiguratsiyasi saqlandi.");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Telegram konfiguratsiyasini saqlashda xatolik.");
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await authAPI.createAlertRule(newRule);
      setNewRule({ name: '', condition_type: 'anomaly_count', threshold: 5, action: 'all' });
      fetchData();
      setSuccess("Ogohlantirish qoidasi yaratildi.");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Qoida yaratishda xatolik.");
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      await authAPI.deleteAlertRule(id);
      fetchData();
    } catch {
      setError("Qoidani o'chirishda xatolik.");
    }
  };

  const handleToggleRule = async (id, isActive) => {
    try {
      await authAPI.updateAlertRule(id, { is_active: !isActive });
      fetchData();
    } catch {
      setError("Qoidani yangilashda xatolik.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton height="h-8" className="w-48" />
        <div className="card p-6">
          <Skeleton lines={4} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Sozlamalar</h1>
        <p className="text-sm text-text-secondary mt-1">Tizim konfiguratsiyasi va ogohlantirishlar</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-danger px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-100 text-success px-4 py-3 rounded-xl mb-4 text-sm">{success}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Telegram tab */}
      {activeTab === 'telegram' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-primary-light" />
            Telegram konfiguratsiyasi
          </h2>
          <form onSubmit={handleTelegramSave} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-text-primary mb-1.5">Chat ID</label>
              <input
                type="text"
                value={telegramConfig.chat_id}
                onChange={(e) => setTelegramConfig({ ...telegramConfig, chat_id: e.target.value })}
                className="input-field"
                placeholder="Telegram Chat ID kiriting"
              />
            </div>
            <button type="submit" className="btn-primary">Saqlash</button>
          </form>
        </div>
      )}

      {/* Alerts tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Plus size={20} className="text-primary-light" />
              Yangi qoida
            </h2>
            <form onSubmit={handleCreateRule} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Nomi</label>
                <input type="text" value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Shart</label>
                <select value={newRule.condition_type} onChange={(e) => setNewRule({ ...newRule, condition_type: e.target.value })} className="input-field">
                  <option value="anomaly_count">Anomaliya soni</option>
                  <option value="failed_logins">Muvaffaqiyatsiz kirishlar</option>
                  <option value="error_rate">Xatolik darajasi</option>
                  <option value="honeypot_access">Honeypot kirish</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Chegara</label>
                <input type="number" value={newRule.threshold} onChange={(e) => setNewRule({ ...newRule, threshold: parseFloat(e.target.value) })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Harakat</label>
                <select value={newRule.action} onChange={(e) => setNewRule({ ...newRule, action: e.target.value })} className="input-field">
                  <option value="all">Barcha kanallar</option>
                  <option value="email">Email</option>
                  <option value="telegram">Telegram</option>
                  <option value="notification">Ilova ichida</option>
                </select>
              </div>
              <button type="submit" className="btn-primary flex items-center justify-center gap-2">
                <Plus size={16} />
                Qo'shish
              </button>
            </form>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-text-primary">Mavjud qoidalar</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Nomi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Shart</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Chegara</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Harakat</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Holat</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {alertRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{rule.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{rule.condition_type}</td>
                    <td className="px-4 py-3">{rule.threshold}</td>
                    <td className="px-4 py-3 text-text-secondary">{rule.action}</td>
                    <td className="px-4 py-3">
                      <span className={rule.is_active ? 'badge-success' : 'badge-neutral'}>
                        {rule.is_active ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleRule(rule.id, rule.is_active)}
                          className="p-1.5 text-text-secondary hover:bg-gray-100 rounded-lg transition-colors"
                          title={rule.is_active ? "O'chirish" : "Yoqish"}
                        >
                          {rule.is_active ? <ToggleRight size={18} className="text-success" /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 text-danger hover:bg-red-50 rounded-lg transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {alertRules.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-text-secondary">
                      Ogohlantirish qoidalari sozlanmagan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
