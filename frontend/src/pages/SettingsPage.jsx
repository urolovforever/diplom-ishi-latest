import { useState, useEffect } from 'react';
import authAPI from '../api/authAPI';
import LoadingSpinner from '../components/ui/LoadingSpinner';

function SettingsPage() {
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
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramSave = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await authAPI.updateTelegramConfig(telegramConfig);
      setSuccess('Telegram configuration saved.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save Telegram config.');
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await authAPI.createAlertRule(newRule);
      setNewRule({ name: '', condition_type: 'anomaly_count', threshold: 5, action: 'all' });
      fetchData();
      setSuccess('Alert rule created.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to create alert rule.');
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      await authAPI.deleteAlertRule(id);
      fetchData();
    } catch {
      setError('Failed to delete alert rule.');
    }
  };

  const handleToggleRule = async (id, isActive) => {
    try {
      await authAPI.updateAlertRule(id, { is_active: !isActive });
      fetchData();
    } catch {
      setError('Failed to update alert rule.');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Telegram Configuration</h2>
        <form onSubmit={handleTelegramSave} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Chat ID</label>
            <input
              type="text"
              value={telegramConfig.chat_id}
              onChange={(e) => setTelegramConfig({ ...telegramConfig, chat_id: e.target.value })}
              className="border rounded px-3 py-2"
              placeholder="Enter Telegram Chat ID"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Save
          </button>
        </form>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Alert Rules</h2>
        <form onSubmit={handleCreateRule} className="flex flex-wrap gap-4 items-end mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <input
              type="text"
              value={newRule.name}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Condition</label>
            <select
              value={newRule.condition_type}
              onChange={(e) => setNewRule({ ...newRule, condition_type: e.target.value })}
              className="border rounded px-3 py-2"
            >
              <option value="anomaly_count">Anomaly Count</option>
              <option value="failed_logins">Failed Logins</option>
              <option value="error_rate">Error Rate</option>
              <option value="honeypot_access">Honeypot Access</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Threshold</label>
            <input
              type="number"
              value={newRule.threshold}
              onChange={(e) => setNewRule({ ...newRule, threshold: parseFloat(e.target.value) })}
              className="border rounded px-3 py-2 w-24"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Action</label>
            <select
              value={newRule.action}
              onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
              className="border rounded px-3 py-2"
            >
              <option value="all">All Channels</option>
              <option value="email">Email</option>
              <option value="telegram">Telegram</option>
              <option value="notification">In-App</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add Rule
          </button>
        </form>

        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Condition</th>
              <th className="px-4 py-2 text-left">Threshold</th>
              <th className="px-4 py-2 text-left">Action</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {alertRules.map((rule) => (
              <tr key={rule.id} className="border-b">
                <td className="px-4 py-2">{rule.name}</td>
                <td className="px-4 py-2">{rule.condition_type}</td>
                <td className="px-4 py-2">{rule.threshold}</td>
                <td className="px-4 py-2">{rule.action}</td>
                <td className="px-4 py-2">
                  <span className={rule.is_active ? 'text-green-600' : 'text-gray-400'}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2 flex gap-2">
                  <button
                    onClick={() => handleToggleRule(rule.id, rule.is_active)}
                    className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                  >
                    {rule.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {alertRules.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  No alert rules configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SettingsPage;
