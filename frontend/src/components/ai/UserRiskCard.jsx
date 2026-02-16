function UserRiskCard({ user, score, severity }) {
  const colors = {
    critical: 'border-red-500 bg-red-50',
    high: 'border-orange-500 bg-orange-50',
    medium: 'border-yellow-500 bg-yellow-50',
    low: 'border-green-500 bg-green-50',
  };

  return (
    <div className={`rounded-lg border-l-4 p-4 ${colors[severity] || colors.low}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium text-gray-800">{user}</p>
          <p className="text-xs text-gray-500">Risk Level: {severity?.toUpperCase()}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{Math.abs(score || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-500">Anomaly Score</p>
        </div>
      </div>
    </div>
  );
}

export default UserRiskCard;
