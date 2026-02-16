function ExplainPanel({ features = {} }) {
  const entries = Object.entries(features).sort(
    ([, a], [, b]) => {
      const aVal = typeof a === 'object' ? Math.abs(a.contribution || 0) : Math.abs(a || 0);
      const bVal = typeof b === 'object' ? Math.abs(b.contribution || 0) : Math.abs(b || 0);
      return bVal - aVal;
    }
  );

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">AI Explanation</h3>
        <p className="text-gray-400 text-sm">No feature data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-500 mb-3">AI Explanation - Why anomaly?</h3>
      <div className="space-y-2">
        {entries.map(([key, val]) => {
          const value = typeof val === 'object' ? val.value : val;
          const contribution = typeof val === 'object' ? val.contribution : null;
          const percent = contribution ? Math.abs(contribution * 100).toFixed(0) : null;

          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-48 truncate">{key.replace(/_/g, ' ')}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, Math.abs(value || 0) * 10)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-16 text-right">
                {typeof value === 'number' ? value.toFixed(2) : value}
              </span>
              {percent && (
                <span className="text-xs text-red-600 w-10 text-right">{percent}%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ExplainPanel;
