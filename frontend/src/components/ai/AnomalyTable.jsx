import { formatDate } from '../../utils/helpers';
import { Eye, CheckCircle, XCircle } from 'lucide-react';

const severityConfig = {
  critical: 'badge-danger',
  high: 'badge-warning',
  medium: 'badge-info',
  low: 'badge-neutral',
};

function AnomalyTable({ anomalies = [], onResolve, onMarkFalsePositive, onViewDetail }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-text-primary">So'nggi anomaliyalar</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface">
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Foydalanuvchi</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Darajasi</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Ball</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Aniqlangan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Holat</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {anomalies.map((a) => (
              <tr key={a.id} className="hover:bg-surface/50 transition-colors">
                <td className="px-4 py-3 font-medium">{a.user?.email || 'N/A'}</td>
                <td className="px-4 py-3">
                  <span className={severityConfig[a.severity] || 'badge-neutral'}>{a.severity}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{a.anomaly_score?.toFixed(4) || '-'}</td>
                <td className="px-4 py-3 text-text-secondary">{formatDate(a.detected_at)}</td>
                <td className="px-4 py-3">
                  {a.is_resolved ? (
                    <span className="badge-success">Hal qilingan</span>
                  ) : (
                    <span className="badge-danger">Kutilmoqda</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {onViewDetail && (
                      <button
                        onClick={() => onViewDetail(a)}
                        className="p-1.5 text-primary-light hover:bg-blue-50 rounded-lg transition-colors"
                        title="Batafsil"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                    {!a.is_resolved && (
                      <>
                        <button
                          onClick={() => onResolve?.(a.id)}
                          className="p-1.5 text-success hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Hal qilish"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => onMarkFalsePositive?.(a.id)}
                          className="p-1.5 text-text-secondary hover:bg-gray-100 rounded-lg transition-colors"
                          title="Yolg'on ijobiy"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {anomalies.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-12 text-center text-text-secondary">
                  Anomaliyalar aniqlanmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AnomalyTable;
