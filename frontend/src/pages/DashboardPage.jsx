import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchDashboardStats } from '../store/confessionsSlice';
import { usePermission } from '../hooks/usePermission';
import StatCard from '../components/dashboard/StatCard';
import ActivityChart from '../components/dashboard/ActivityChart';
import ConfessionsPieChart from '../components/dashboard/ConfessionsPieChart';
import RecentAlerts from '../components/dashboard/RecentAlerts';
import RecentDocumentsTable from '../components/dashboard/RecentDocumentsTable';
import { BookOpen, FileText, Bell, Building2, Users, ShieldAlert, AlertTriangle } from 'lucide-react';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  qomita_rahbar: "Qo'mita Rahbari",
  qomita_xodimi: "Qo'mita Xodimi",
  konfessiya_rahbari: 'Konfessiya Rahbari',
  konfessiya_xodimi: 'Konfessiya Xodimi',
  adliya_xodimi: 'Adliya Xodimi',
  kengash_azo: "Kengash A'zosi",
};

const CATEGORY_LABELS = {
  registration: "Ro'yxatga olish",
  reports: 'Hisobotlar',
  normative: "Me'yoriy",
  confidential: 'Maxfiy',
};

const TYPE_LABELS = {
  diniy: 'Diniy',
  fuqarolik: 'Fuqarolik',
};

function DashboardPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { stats } = useSelector((state) => state.confessions);
  const { canViewAIDashboard } = usePermission();

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  const isAdmin = user?.role?.name === 'super_admin' || user?.role?.name === 'qomita_rahbar';

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
        />
        <StatCard
          title="Hujjatlar"
          value={stats?.documents}
          icon={FileText}
          color="green"
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

      {/* Admin-only: Extra stat cards */}
      {isAdmin && stats?.total_users !== undefined && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Jami foydalanuvchilar"
            value={stats.total_users}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="AI anomaliyalar"
            value={stats.anomalies_total}
            icon={ShieldAlert}
            color="red"
          />
          <StatCard
            title="Hal qilinmagan"
            value={stats.anomalies_unresolved}
            icon={AlertTriangle}
            color="yellow"
            pulsating={stats.anomalies_critical > 0}
          />
          <StatCard
            title="Kritik anomaliyalar"
            value={stats.anomalies_critical}
            icon={AlertTriangle}
            color="red"
            pulsating={stats.anomalies_critical > 0}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ActivityChart data={stats?.activity_data || []} />
        <ConfessionsPieChart stats={stats} />
      </div>

      {/* Admin-only: Breakdown cards */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Confession types */}
          {stats?.confession_types && Object.keys(stats.confession_types).length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Konfessiya turlari</h3>
              <div className="space-y-2">
                {Object.entries(stats.confession_types).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">{TYPE_LABELS[type] || type}</span>
                    <span className="text-sm font-semibold text-text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document categories */}
          {stats?.document_categories && Object.keys(stats.document_categories).length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Hujjat kategoriyalari</h3>
              <div className="space-y-2">
                {Object.entries(stats.document_categories).map(([cat, count]) => (
                  <div key={cat} className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">{CATEGORY_LABELS[cat] || cat}</span>
                    <span className="text-sm font-semibold text-text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users by role */}
          {stats?.users_by_role && Object.keys(stats.users_by_role).length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Rollar bo'yicha</h3>
              <div className="space-y-2">
                {Object.entries(stats.users_by_role).map(([role, count]) => (
                  <div key={role} className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">{ROLE_LABELS[role] || role}</span>
                    <span className="text-sm font-semibold text-text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentAlerts alerts={stats?.recent_alerts || []} />
        <RecentDocumentsTable documents={stats?.recent_documents || []} />
      </div>
    </div>
  );
}

export default DashboardPage;
