import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import Skeleton from '../components/ui/Skeleton';
import Pagination from '../components/ui/Pagination';
import { Download, ScrollText, Search } from 'lucide-react';

function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ action: '', model_name: '' });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = { page };
      if (filters.action) params.action = filters.action;
      if (filters.model_name) params.model_name = filters.model_name;
      const response = await api.get('/audit/logs/', { params });
      setLogs(response.data.results || []);
      const count = response.data.count || 0;
      setTotalPages(Math.ceil(count / 20) || 1);
    } catch {
      setError("Audit jurnalini yuklashda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const handleExportCSV = () => {
    const headers = ['Sana', 'Foydalanuvchi', 'Harakat', 'Model', 'Obyekt ID', 'IP Manzil'];
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
    create: 'badge-success',
    delete: 'badge-danger',
    update: 'badge-warning',
    read: 'badge-info',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Audit jurnali</h1>
          <p className="text-sm text-text-secondary mt-1">Tizim harakatlari tarixi</p>
        </div>
        <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-2">
          <Download size={16} />
          CSV eksport
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
          <option value="">Barcha harakatlar</option>
          <option value="create">Yaratish</option>
          <option value="read">O'qish</option>
          <option value="update">Yangilash</option>
          <option value="delete">O'chirish</option>
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Model nomi bo'yicha qidirish..."
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
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Sana</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Foydalanuvchi</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Harakat</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Obyekt ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">IP Manzil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3 text-text-secondary">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium">{log.user?.email || 'Tizim'}</td>
                      <td className="px-4 py-3">
                        <span className={actionConfig[log.action] || 'badge-neutral'}>{log.action}</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{log.model_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">{log.object_id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-text-secondary">{log.ip_address || 'N/A'}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-text-secondary">
                        Audit yozuvlari topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AuditLogPage;
