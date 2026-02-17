import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#64748B', '#2E86C1', '#F59E0B', '#10B981', '#EF4444'];
const LABELS = {
  draft: 'Qoralama',
  submitted: 'Yuborilgan',
  under_review: "Ko'rib chiqilmoqda",
  approved: 'Tasdiqlangan',
  rejected: 'Rad etilgan',
};

function ConfessionsPieChart({ stats }) {
  if (!stats) return null;

  const data = [
    { name: LABELS.draft, value: stats.confessions_draft || 0 },
    { name: LABELS.submitted, value: stats.confessions_submitted || 0 },
    { name: LABELS.under_review, value: stats.confessions_under_review || 0 },
    { name: LABELS.approved, value: stats.confessions_approved || 0 },
    { name: LABELS.rejected, value: stats.confessions_rejected || 0 },
  ].filter((d) => d.value > 0);

  if (data.length === 0) return null;

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Konfessiyalar holati</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-text-secondary">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ConfessionsPieChart;
