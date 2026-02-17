import { formatDate } from '../../utils/helpers';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'text-danger', bg: 'bg-red-50', bar: 'bg-danger' },
  high: { icon: AlertCircle, color: 'text-warning', bg: 'bg-amber-50', bar: 'bg-warning' },
  medium: { icon: Info, color: 'text-primary-light', bg: 'bg-blue-50', bar: 'bg-primary-light' },
  low: { icon: Info, color: 'text-text-secondary', bg: 'bg-gray-50', bar: 'bg-gray-400' },
};

function RecentAlerts({ alerts = [] }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">So'nggi ogohlantirishlar</h3>
      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert, idx) => {
            const config = severityConfig[alert.severity] || severityConfig.low;
            const Icon = config.icon;
            return (
              <div key={alert.id || idx} className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${config.bg}`}>
                  <Icon size={16} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{alert.title}</p>
                  <p className="text-xs text-text-secondary">{formatDate(alert.detected_at || alert.created_at)}</p>
                </div>
                <div className="w-16">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${config.bar}`}
                      style={{ width: alert.severity === 'critical' ? '100%' : alert.severity === 'high' ? '75%' : alert.severity === 'medium' ? '50%' : '25%' }}
                    />
                  </div>
                </div>
                <span className={`badge-${alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'info'} text-[10px]`}>
                  {alert.severity}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center py-8 text-text-secondary text-sm">
          Ogohlantirishlar yo'q
        </div>
      )}
    </div>
  );
}

export default RecentAlerts;
