function StatCard({ title, value, trend, icon, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold mt-1">{value ?? '-'}</p>
        </div>
        {icon && (
          <div className={`p-2 rounded-lg ${colors[color]}`}>
            <span className="text-xl">{icon}</span>
          </div>
        )}
      </div>
      {trend !== undefined && (
        <p className={`text-xs mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? '+' : ''}{trend}% from last period
        </p>
      )}
    </div>
  );
}

export default StatCard;
