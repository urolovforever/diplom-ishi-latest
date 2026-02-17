import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function ActivityChart({ data = [], title = "Faollik dinamikasi" }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" fontSize={12} tick={{ fill: '#64748B' }} />
            <YAxis fontSize={12} tick={{ fill: '#64748B' }} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="normal"
              name="Normal"
              stroke="#2E86C1"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="anomaly"
              name="Anomaliya"
              stroke="#EF4444"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
            />
            {/* Fallback single line if data uses "count" */}
            {data[0]?.count !== undefined && (
              <Line
                type="monotone"
                dataKey="count"
                name="Jami"
                stroke="#2E86C1"
                strokeWidth={2}
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[280px] text-text-secondary text-sm">
          Ma'lumotlar mavjud emas
        </div>
      )}
    </div>
  );
}

export default ActivityChart;
