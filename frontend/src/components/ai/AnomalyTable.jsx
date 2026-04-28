import { useTranslation } from 'react-i18next';
import { formatDate } from '../../utils/helpers';
import { Eye, CheckCircle, XCircle } from 'lucide-react';

const severityConfig = {
  critical: 'badge-danger',
  high: 'badge-warning',
  medium: 'badge-info',
  low: 'badge-neutral',
};

function AnomalyTable({ anomalies = [], onResolve, onMarkFalsePositive, onViewDetail }) {
  const { t } = useTranslation('ai');
  return (
    <>
      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        <div className="px-1">
          <h3 className="text-sm font-semibold text-text-primary">{t('table.title')}</h3>
        </div>
        {anomalies.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-text-primary text-sm">{a.user?.email || 'N/A'}</span>
              <span className={severityConfig[a.severity] || 'badge-neutral'}>{a.severity}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                <span className="font-mono">{a.anomaly_score?.toFixed(4) || '-'}</span>
                <span>{formatDate(a.detected_at)}</span>
              </div>
              {a.is_resolved ? (
                <span className="badge-success">{t('badges.resolved')}</span>
              ) : (
                <span className="badge-danger">{t('badges.pending')}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {onViewDetail && (
                <button onClick={() => onViewDetail(a)} className="p-1.5 text-primary-light hover:bg-blue-50 rounded-lg transition-colors" title={t('actions.view_details')}>
                  <Eye size={16} />
                </button>
              )}
              {!a.is_resolved && (
                <>
                  <button onClick={() => onResolve?.(a.id)} className="p-1.5 text-success hover:bg-emerald-50 rounded-lg transition-colors" title={t('actions.resolve')}>
                    <CheckCircle size={16} />
                  </button>
                  <button onClick={() => onMarkFalsePositive?.(a.id)} className="p-1.5 text-text-secondary hover:bg-gray-100 rounded-lg transition-colors" title={t('actions.false_positive')}>
                    <XCircle size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {anomalies.length === 0 && (
          <div className="card p-8 text-center text-text-secondary text-sm">
            {t('empty.no_anomalies')}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="card overflow-hidden hidden md:block">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-text-primary">{t('table.title')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('table.user')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('table.severity')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('table.score')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('table.detected')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('table.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('table.actions')}</th>
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
                      <span className="badge-success">{t('badges.resolved')}</span>
                    ) : (
                      <span className="badge-danger">{t('badges.pending')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {onViewDetail && (
                        <button
                          onClick={() => onViewDetail(a)}
                          className="p-1.5 text-primary-light hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('actions.view_details')}
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      {!a.is_resolved && (
                        <>
                          <button
                            onClick={() => onResolve?.(a.id)}
                            className="p-1.5 text-success hover:bg-emerald-50 rounded-lg transition-colors"
                            title={t('actions.resolve')}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => onMarkFalsePositive?.(a.id)}
                            className="p-1.5 text-text-secondary hover:bg-gray-100 rounded-lg transition-colors"
                            title={t('actions.false_positive')}
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
                    {t('empty.no_anomalies')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default AnomalyTable;
