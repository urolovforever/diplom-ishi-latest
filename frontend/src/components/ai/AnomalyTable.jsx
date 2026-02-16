import Badge from '../ui/Badge';
import { formatDate } from '../../utils/helpers';

const severityColors = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

function AnomalyTable({ anomalies = [], onResolve, onMarkFalsePositive }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <h3 className="text-sm font-medium text-gray-500 p-4 border-b">Recent Anomalies</h3>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">User</th>
            <th className="px-4 py-2 text-left">Severity</th>
            <th className="px-4 py-2 text-left">Score</th>
            <th className="px-4 py-2 text-left">Detected</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {anomalies.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="px-4 py-2">{a.user?.email || 'N/A'}</td>
              <td className="px-4 py-2">
                <Badge type={severityColors[a.severity]}>{a.severity}</Badge>
              </td>
              <td className="px-4 py-2">{a.anomaly_score?.toFixed(4) || '-'}</td>
              <td className="px-4 py-2">{formatDate(a.detected_at)}</td>
              <td className="px-4 py-2">
                {a.is_resolved ? (
                  <span className="text-green-600">Resolved</span>
                ) : (
                  <span className="text-red-600">Pending</span>
                )}
              </td>
              <td className="px-4 py-2">
                {!a.is_resolved && (
                  <div className="flex gap-1">
                    <button onClick={() => onResolve?.(a.id)} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200">
                      Resolve
                    </button>
                    <button onClick={() => onMarkFalsePositive?.(a.id)} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded hover:bg-gray-200">
                      False +
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {anomalies.length === 0 && (
            <tr>
              <td colSpan="6" className="px-4 py-8 text-center text-gray-500">No anomalies detected.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AnomalyTable;
