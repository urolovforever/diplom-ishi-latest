import { useState, useEffect } from 'react';
import aiAPI from '../api/aiAPI';
import StatCard from '../components/dashboard/StatCard';
import AnomalyChart from '../components/ai/AnomalyChart';
import AnomalyTable from '../components/ai/AnomalyTable';
import AnomalyTypesChart from '../components/ai/AnomalyTypesChart';
import ExplainPanel from '../components/ai/ExplainPanel';
import Skeleton from '../components/ui/Skeleton';
import { BrainCircuit, AlertTriangle, CheckCircle, ShieldAlert, Radar } from 'lucide-react';

function AIDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await aiAPI.getDashboardStats();
      setStats(response.data);
    } catch (err) {
      setError("Dashboard ma'lumotlarini yuklashda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleScan = async () => {
    try {
      setScanning(true);
      await aiAPI.triggerScan();
      setTimeout(fetchStats, 3000);
    } catch {
      setError('Skanerlashni boshlashda xatolik.');
    } finally {
      setScanning(false);
    }
  };

  const handleReview = async (id, isFalsePositive) => {
    try {
      await aiAPI.reviewAnomaly(id, {
        is_false_positive: isFalsePositive,
        resolve: true,
      });
      fetchStats();
    } catch {
      setError("Anomaliyani ko'rib chiqishda xatolik.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <Skeleton className="w-24" />
              <Skeleton className="w-16" height="h-8" />
            </div>
          ))}
        </div>
        <div className="card p-5">
          <Skeleton className="w-full" height="h-[320px]" />
        </div>
      </div>
    );
  }

  // Build chart data from recent anomalies
  const chartData = stats?.recent_anomalies?.map((a, i) => ({
    time: new Date(a.detected_at).toLocaleDateString('uz', { day: '2-digit', month: '2-digit' }),
    score: Math.abs(a.anomaly_score || 0),
  })) || [];

  // Build anomaly types data
  const typeMap = {};
  stats?.recent_anomalies?.forEach((a) => {
    const type = a.anomaly_type || a.severity || 'other';
    typeMap[type] = (typeMap[type] || 0) + 1;
  });
  const typesData = Object.entries(typeMap).map(([type, count]) => ({ type, name: type, count }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI Xavfsizlik Paneli</h1>
          <p className="text-sm text-text-secondary mt-1">
            Sun'iy intellekt yordamida real vaqtda tahdidlarni aniqlash
          </p>
        </div>
        <button onClick={handleScan} disabled={scanning} className="btn-primary flex items-center gap-2">
          <Radar size={18} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Skanerlanmoqda...' : 'Skanerlash'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-danger px-4 py-3 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Jami anomaliyalar"
              value={stats.total_anomalies}
              icon={BrainCircuit}
              color="blue"
              pulsating
            />
            <StatCard
              title="Ko'rib chiqilmagan"
              value={stats.unreviewed_count}
              icon={AlertTriangle}
              color="yellow"
            />
            <StatCard
              title="Hal qilingan"
              value={stats.resolved_count}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              title="Kritik"
              value={stats.critical_count}
              icon={ShieldAlert}
              color="red"
            />
          </div>

          {/* Area chart - full width */}
          <div className="mb-6">
            <AnomalyChart data={chartData} />
          </div>

          {/* Anomaly table + bar chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2">
              <AnomalyTable
                anomalies={stats.recent_anomalies}
                onResolve={(id) => handleReview(id, false)}
                onMarkFalsePositive={(id) => handleReview(id, true)}
                onViewDetail={setSelectedAnomaly}
              />
            </div>
            <AnomalyTypesChart data={typesData} />
          </div>

          {/* Model status */}
          {stats.model_status && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Model holati</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-text-secondary">Nomi</p>
                  <p className="font-medium">{stats.model_status.name}</p>
                </div>
                <div>
                  <p className="text-text-secondary">Oxirgi o'qitilgan</p>
                  <p className="font-medium">
                    {stats.model_status.last_trained_at
                      ? new Date(stats.model_status.last_trained_at).toLocaleString()
                      : "Hech qachon"}
                  </p>
                </div>
                <div>
                  <p className="text-text-secondary">Namunalar</p>
                  <p className="font-medium">{stats.model_status.training_samples_count}</p>
                </div>
                <div>
                  <p className="text-text-secondary">Chegara</p>
                  <p className="font-medium">{stats.model_status.threshold}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selectedAnomaly && (
        <ExplainPanel
          anomaly={selectedAnomaly}
          features={selectedAnomaly.feature_importance || selectedAnomaly.explanation || {}}
          onClose={() => setSelectedAnomaly(null)}
        />
      )}
    </div>
  );
}

export default AIDashboardPage;
