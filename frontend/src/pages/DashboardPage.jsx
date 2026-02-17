import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchDashboardStats } from '../store/confessionsSlice';
import StatCard from '../components/dashboard/StatCard';
import ActivityChart from '../components/dashboard/ActivityChart';
import ConfessionsPieChart from '../components/dashboard/ConfessionsPieChart';
import RecentAlerts from '../components/dashboard/RecentAlerts';
import RecentDocumentsTable from '../components/dashboard/RecentDocumentsTable';
import { BookOpen, FileText, Bell, Building2 } from 'lucide-react';

function DashboardPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { stats } = useSelector((state) => state.confessions);

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Bosh sahifa</h1>
        <p className="text-sm text-text-secondary mt-1">
          Xush kelibsiz, {user?.first_name || 'Foydalanuvchi'}!
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Jami konfessiyalar"
          value={stats?.confessions}
          icon={BookOpen}
          color="blue"
          trend={5}
        />
        <StatCard
          title="Hujjatlar"
          value={stats?.documents}
          icon={FileText}
          color="green"
          trend={12}
        />
        <StatCard
          title="O'qilmagan xabarlar"
          value={stats?.notifications}
          icon={Bell}
          color="yellow"
        />
        <StatCard
          title="Tashkilotlar"
          value={stats?.organizations}
          icon={Building2}
          color="purple"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ActivityChart data={stats?.activity_data || []} />
        <ConfessionsPieChart stats={stats} />
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentAlerts alerts={stats?.recent_alerts || []} />
        <RecentDocumentsTable documents={stats?.recent_documents || []} />
      </div>
    </div>
  );
}

export default DashboardPage;
