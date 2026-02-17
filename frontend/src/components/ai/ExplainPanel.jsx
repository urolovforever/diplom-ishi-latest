import { X, User, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';

function ExplainPanel({ anomaly, features = {}, onClose }) {
  const entries = Object.entries(features).sort(
    ([, a], [, b]) => {
      const aVal = typeof a === 'object' ? Math.abs(a.contribution || 0) : Math.abs(a || 0);
      const bVal = typeof b === 'object' ? Math.abs(b.contribution || 0) : Math.abs(b || 0);
      return bVal - aVal;
    }
  );

  const score = anomaly?.anomaly_score || 0;
  const scoreColor = score > 0.7 ? 'text-danger' : score > 0.4 ? 'text-warning' : 'text-success';
  const ScoreIcon = score > 0.7 ? ShieldAlert : ShieldCheck;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-card shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-card">
          <h2 className="text-lg font-bold text-text-primary">Anomaliya tafsilotlari</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* User info */}
          {anomaly && (
            <div className="flex items-center gap-4 p-4 bg-surface rounded-xl">
              <div className="w-12 h-12 bg-primary-light/10 rounded-full flex items-center justify-center">
                <User size={24} className="text-primary-light" />
              </div>
              <div>
                <p className="font-medium text-text-primary">{anomaly.user?.email || anomaly.title || 'N/A'}</p>
                <p className="text-sm text-text-secondary">{anomaly.user?.full_name || ''}</p>
              </div>
            </div>
          )}

          {/* Score display */}
          <div className="text-center py-4">
            <ScoreIcon size={40} className={`mx-auto mb-2 ${scoreColor}`} />
            <p className={`text-5xl font-bold ${scoreColor}`}>
              {score.toFixed(4)}
            </p>
            <p className="text-sm text-text-secondary mt-1">Anomaliya bali</p>
          </div>

          {/* Feature bars */}
          {entries.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">AI tushuntirishi</h3>
              <div className="space-y-3">
                {entries.map(([key, val]) => {
                  const value = typeof val === 'object' ? val.value : val;
                  const contribution = typeof val === 'object' ? val.contribution : null;
                  const percent = contribution ? Math.abs(contribution * 100) : Math.abs(value || 0) * 10;
                  const barWidth = Math.min(100, percent);

                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">{key.replace(/_/g, ' ')}</span>
                        <span className="text-text-primary font-medium">
                          {typeof value === 'number' ? value.toFixed(2) : value}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            barWidth > 70 ? 'bg-danger' : barWidth > 40 ? 'bg-warning' : 'bg-success'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary text-center">AI tushuntirish ma'lumotlari mavjud emas</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} />
              Hal qilish
            </button>
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Yolg'on ijobiy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExplainPanel;
