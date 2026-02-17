import { useState, useEffect } from 'react';
import reportAPI from '../api/reportAPI';
import Skeleton from '../components/ui/Skeleton';
import { FileDown, BarChart3, Calendar, Plus } from 'lucide-react';

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    report_type: 'activity',
    date_from: '',
    date_to: '',
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await reportAPI.getReports();
      setReports(response.data.results || response.data || []);
    } catch {
      setError("Hisobotlarni yuklashda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setError(null);
      await reportAPI.generateReport(form);
      fetchReports();
    } catch {
      setError("Hisobot yaratishda xatolik.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (id, title) => {
    try {
      const response = await reportAPI.downloadReport(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title || 'hisobot'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Hisobotni yuklab olishda xatolik.");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Hisobotlar</h1>
        <p className="text-sm text-text-secondary mt-1">Hisobotlarni yaratish va yuklab olish</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-danger px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
      )}

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Plus size={20} className="text-primary-light" />
          Hisobot yaratish
        </h2>
        <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Hisobot turi</label>
            <select value={form.report_type} onChange={(e) => setForm({ ...form, report_type: e.target.value })} className="input-field">
              <option value="activity">Faollik hisoboti</option>
              <option value="security">Xavfsizlik hisoboti</option>
              <option value="confession">Konfessiya hisoboti</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Boshlanish</label>
            <input type="date" value={form.date_from} onChange={(e) => setForm({ ...form, date_from: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Tugash</label>
            <input type="date" value={form.date_to} onChange={(e) => setForm({ ...form, date_to: e.target.value })} className="input-field" />
          </div>
          <button type="submit" disabled={generating} className="btn-primary flex items-center justify-center gap-2">
            <BarChart3 size={16} />
            {generating ? 'Yaratilmoqda...' : 'Yaratish'}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="card p-5">
          <Skeleton lines={5} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-text-primary">Yaratilgan hisobotlar</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Nomi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Turi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Yaratilgan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-surface/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{report.title}</td>
                  <td className="px-4 py-3">
                    <span className="badge-info">{report.report_type}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(report.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDownload(report.id, report.title)}
                      className="flex items-center gap-1.5 text-primary-light hover:text-primary font-medium text-sm transition-colors"
                    >
                      <FileDown size={16} />
                      PDF yuklab olish
                    </button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-12 text-center text-text-secondary">
                    Hisobotlar hali yaratilmagan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ReportsPage;
