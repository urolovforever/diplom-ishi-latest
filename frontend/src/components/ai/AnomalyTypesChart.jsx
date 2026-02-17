import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const LABELS = {
  unusual_access: "G'ayrioddiy kirish",
  brute_force: 'Parol buzish urinishi',
  data_exfiltration: "Ma'lumotlarni olib chiqish",
  privilege_escalation: "Ruxsat oshirish",
  suspicious_download: "Shubhali yuklash",
  off_hours: "Ish vaqtidan tashqari",
};

function AnomalyTypesChart({ data = [] }) {
  const chartData = data.map((item) => ({
    ...item,
    name: LABELS[item.type] || item.type || item.name,
  }));

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Anomaliya turlari</h3>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" fontSize={11} tick={{ fill: '#64748B' }} />
            <YAxis type="category" dataKey="name" fontSize={11} tick={{ fill: '#64748B' }} width={140} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            />
            <Bar dataKey="count" fill="#2E86C1" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[280px] text-text-secondary text-sm">
          Ma'lumotlar mavjud emas
        </div>
      )}
    </div>
  );
}

export default AnomalyTypesChart;
