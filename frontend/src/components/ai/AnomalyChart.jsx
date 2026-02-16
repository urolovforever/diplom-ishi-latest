import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function AnomalyChart({ anomalies = [] }) {
  const data = anomalies.map((a) => ({
    name: a.user?.email?.split('@')[0] || 'N/A',
    score: Math.abs(a.anomaly_score || 0),
    severity: a.severity,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-500 mb-3">Anomaly Scores</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="score" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-400 text-sm text-center py-8">No anomaly data to display.</p>
      )}
    </div>
  );
}

export default AnomalyChart;
