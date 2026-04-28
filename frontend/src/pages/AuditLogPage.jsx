import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axiosConfig';
import Skeleton from '../components/ui/Skeleton';
import Pagination from '../components/ui/Pagination';
import { Download, ScrollText, Search } from 'lucide-react';

function AuditLogPage() {
  const { t } = useTranslation('audit');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [filters, setFilters] = useState({ action: '', model_name: '' });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = { page };
      if (filters.action) params.action = filters.action;
      if (filters.model_name) params.model_name = filters.model_name;
      const response = await api.get('/audit/logs/', { params });
      setLogs(response.data.results || []);
      setCount(response.data.count || 0);
    } catch {
      setError(t('errors.load_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const handleExportCSV = () => {
    const headers = [t('table.date'), t('table.user'), t('table.action'), t('table.model'), t('table.object_id'), t('table.ip_address')];
    const rows = logs.map((log) => [
      new Date(log.created_at).toISOString(),
      log.user?.email || 'N/A',
      log.action,
      log.model_name,
      log.object_id,
      log.ip_address || 'N/A',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'audit_jurnal.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const actionConfig = {
    create: { class: 'badge-success', label: t('actions.create') },
    delete: { class: 'badge-danger', label: t('actions.delete') },
    update: { class: 'badge-warning', label: t('actions.update') },
    read: { class: 'badge-info', label: t('actions.read') },
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('page.title')}</h1>
          <p className="text-sm text-text-secondary mt-1">{t('page.description')}</p>
        </div>
        <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-2">
          <Download size={16} />
          {t('buttons.export_csv')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-danger px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filters.action}
          onChange={(e) => { setFilters({ ...filters, action: e.target.value }); setPage(1); }}
          className="input-field max-w-[180px]"
        >
          <option value="">{t('filters.all_actions')}</option>
          <option value="create">{t('actions.create')}</option>
          <option value="read">{t('actions.read')}</option>
          <option value="update">{t('actions.update')}</option>
          <option value="delete">{t('actions.delete')}</option>
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder={t('search.placeholder')}
            value={filters.model_name}
            onChange={(e) => { setFilters({ ...filters, model_name: e.target.value }); setPage(1); }}
            className="input-field pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="card p-5">
          <Skeleton lines={8} />
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {logs.map((log) => (
              <div key={log.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-text-primary text-sm">{log.user?.email || 'Tizim'}</span>
                  <span className={actionConfig[log.action]?.class || 'badge-neutral'}>{actionConfig[log.action]?.label || log.action}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                  <span>{log.model_name}</span>
                  <span className="font-mono">{log.ip_address || 'N/A'}</span>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="card p-8 text-center text-text-secondary text-sm">
                {t('empty.no_logs')}
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('table.date')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('table.user')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('table.action')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('table.model')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('table.object_id')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('table.ip_address')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3 text-text-secondary">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium">{log.user?.email || 'Tizim'}</td>
                      <td className="px-4 py-3">
                        <span className={actionConfig[log.action]?.class || 'badge-neutral'}>{actionConfig[log.action]?.label || log.action}</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{log.model_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">{log.object_id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-text-secondary">{log.ip_address || 'N/A'}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-text-secondary">
                        {t('empty.no_logs')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination count={count} currentPage={page} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default AuditLogPage;
