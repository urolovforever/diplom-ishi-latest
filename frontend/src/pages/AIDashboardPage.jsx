import { useState, useEffect } from 'react';
import aiAPI from '../api/aiAPI';
import LoadingSpinner from '../components/ui/LoadingSpinner';

function AIDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await aiAPI.getDashboardStats();
      setStats(response.data);
    } catch (err) {
      setError('Failed to load dashboard stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleScan = async () => {
    try {
      setScanning(true);
      await aiAPI.triggerScan();
      setTimeout(fetchStats, 3000);
    } catch {
      setError('Failed to trigger scan.');
    } finally {
      setScanning(false);
    }
  };

  const handleReview = async (id, isFalsePositive) => {
    try {
      await aiAPI.reviewAnomaly(id, {
        is_false_positive: isFalsePositive,
        resolve: true,
      });
      fetchStats();
    } catch {
      setError('Failed to review anomaly.');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">AI Security Dashboard</h1>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {scanning ? 'Scanning...' : 'Scan Now'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded shadow">
              <p className="text-sm text-gray-500">Total Anomalies</p>
              <p className="text-3xl font-bold">{stats.total_anomalies}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <p className="text-sm text-gray-500">Unreviewed</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.unreviewed_count}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <p className="text-sm text-gray-500">Resolved</p>
              <p className="text-3xl font-bold text-green-600">{stats.resolved_count}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <p className="text-sm text-gray-500">Critical</p>
              <p className="text-3xl font-bold text-red-600">{stats.critical_count}</p>
            </div>
          </div>

          {stats.model_status && (
            <div className="bg-white p-4 rounded shadow mb-6">
              <h2 className="text-lg font-semibold mb-2">Model Status</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span> {stats.model_status.name}
                </div>
                <div>
                  <span className="text-gray-500">Last Trained:</span>{' '}
                  {stats.model_status.last_trained_at
                    ? new Date(stats.model_status.last_trained_at).toLocaleString()
                    : 'Never'}
                </div>
                <div>
                  <span className="text-gray-500">Samples:</span>{' '}
                  {stats.model_status.training_samples_count}
                </div>
                <div>
                  <span className="text-gray-500">Threshold:</span> {stats.model_status.threshold}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded shadow">
            <h2 className="text-lg font-semibold p-4 border-b">Recent Anomalies</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Title</th>
                    <th className="px-4 py-2 text-left">Severity</th>
                    <th className="px-4 py-2 text-left">User</th>
                    <th className="px-4 py-2 text-left">Score</th>
                    <th className="px-4 py-2 text-left">Detected</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_anomalies.map((anomaly) => (
                    <tr key={anomaly.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{anomaly.title}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            anomaly.severity === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : anomaly.severity === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : anomaly.severity === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {anomaly.severity}
                        </span>
                      </td>
                      <td className="px-4 py-2">{anomaly.user?.email || 'N/A'}</td>
                      <td className="px-4 py-2">{anomaly.anomaly_score?.toFixed(4) || 'N/A'}</td>
                      <td className="px-4 py-2">
                        {new Date(anomaly.detected_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        {anomaly.is_resolved ? (
                          <span className="text-green-600">Resolved</span>
                        ) : anomaly.reviewed_by ? (
                          <span className="text-yellow-600">Reviewed</span>
                        ) : (
                          <span className="text-red-600">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {!anomaly.is_resolved && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleReview(anomaly.id, false)}
                              className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleReview(anomaly.id, true)}
                              className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded hover:bg-gray-200"
                            >
                              False +
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {stats.recent_anomalies.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                        No anomalies detected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AIDashboardPage;
