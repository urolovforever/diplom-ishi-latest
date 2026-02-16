import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Pagination from '../components/ui/Pagination';

function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    model_name: '',
  });

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
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const handleExportCSV = () => {
    const headers = ['Date', 'User', 'Action', 'Model', 'Object ID', 'IP Address'];
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
    link.setAttribute('download', 'audit_log.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <button
          onClick={handleExportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Export CSV
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <select
          value={filters.action}
          onChange={(e) => {
            setFilters({ ...filters, action: e.target.value });
            setPage(1);
          }}
          className="border rounded px-3 py-2"
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="read">Read</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
        <input
          type="text"
          placeholder="Filter by model name..."
          value={filters.model_name}
          onChange={(e) => {
            setFilters({ ...filters, model_name: e.target.value });
            setPage(1);
          }}
          className="border rounded px-3 py-2"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="bg-white rounded shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Model</th>
                  <th className="px-4 py-2 text-left">Object ID</th>
                  <th className="px-4 py-2 text-left">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2">{log.user?.email || 'System'}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          log.action === 'create'
                            ? 'bg-green-100 text-green-800'
                            : log.action === 'delete'
                            ? 'bg-red-100 text-red-800'
                            : log.action === 'update'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2">{log.model_name}</td>
                    <td className="px-4 py-2 font-mono text-xs">{log.object_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-2">{log.ip_address || 'N/A'}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No audit log entries.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
