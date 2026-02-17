import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea,
} from 'recharts';

function AnomalyChart({ data = [], title = "Anomaliya ko'rsatkichlari" }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2E86C1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2E86C1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            {/* Color zones */}
            <ReferenceArea y1={0} y2={0.4} fill="#10B981" fillOpacity={0.06} />
            <ReferenceArea y1={0.4} y2={0.7} fill="#F59E0B" fillOpacity={0.06} />
            <ReferenceArea y1={0.7} y2={1} fill="#EF4444" fillOpacity={0.06} />
            <XAxis dataKey="time" fontSize={11} tick={{ fill: '#64748B' }} />
            <YAxis domain={[0, 1]} fontSize={11} tick={{ fill: '#64748B' }} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(value) => [typeof value === 'number' ? value.toFixed(4) : value, 'Ball']}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#2E86C1"
              strokeWidth={2}
              fill="url(#scoreGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[320px] text-text-secondary text-sm">
          Ma'lumotlar mavjud emas
        </div>
      )}
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-success/20 border border-success" />
          <span className="text-xs text-text-secondary">Xavfsiz (&lt;0.4)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-warning/20 border border-warning" />
          <span className="text-xs text-text-secondary">Shubhali (0.4-0.7)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-danger/20 border border-danger" />
          <span className="text-xs text-text-secondary">Xavfli (&gt;0.7)</span>
        </div>
      </div>
    </div>
  );
}

export default AnomalyChart;
