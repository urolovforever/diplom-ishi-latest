import Badge from '../ui/Badge';
import { formatDate } from '../../utils/helpers';

function RecentAlerts({ alerts = [] }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-500 mb-3">Recent Alerts</h3>
      {alerts.length > 0 ? (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div key={alert.id || idx} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm text-gray-800">{alert.title}</p>
                <p className="text-xs text-gray-500">{formatDate(alert.detected_at || alert.created_at)}</p>
              </div>
              <Badge type={alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'info'}>
                {alert.severity}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm text-center py-4">No recent alerts.</p>
      )}
    </div>
  );
}

export default RecentAlerts;
