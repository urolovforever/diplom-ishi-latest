import { useCountUp } from '../../hooks/useCountUp';

const iconColors = {
  blue: 'bg-blue-50 text-primary-light',
  green: 'bg-emerald-50 text-success',
  red: 'bg-red-50 text-danger',
  yellow: 'bg-amber-50 text-warning',
  purple: 'bg-purple-50 text-purple-600',
};

function StatCard({ title, value, trend, icon: Icon, color = 'blue', pulsating }) {
  const animatedValue = useCountUp(typeof value === 'number' ? value : 0);
  const displayValue = typeof value === 'number' ? animatedValue : (value ?? '-');

  return (
    <div className="card-hover p-5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-text-secondary font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1.5 text-text-primary">{displayValue}</p>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconColors[color] || iconColors.blue} ${pulsating ? 'animate-pulse-dot' : ''}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3">
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-text-secondary">o'tgan davrga nisbatan</span>
        </div>
      )}
    </div>
  );
}

export default StatCard;
