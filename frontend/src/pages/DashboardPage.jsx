import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchDashboardStats } from '../store/confessionsSlice';
import { usePermission } from '../hooks/usePermission';
import StatCard from '../components/dashboard/StatCard';
import ActivityChart from '../components/dashboard/ActivityChart';
import RecentAlerts from '../components/dashboard/RecentAlerts';
import RecentDocumentsTable from '../components/dashboard/RecentDocumentsTable';
import { FileText, Bell, Building2, Users, ShieldAlert, AlertTriangle } from 'lucide-react';

function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { stats } = useSelector((state) => state.confessions);
  const { canViewAIDashboard } = usePermission();

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  const isAdmin = user?.role?.name === 'super_admin';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">{t('page.title')}</h1>
        <p className="text-sm text-text-secondary mt-1">
          {t('page.welcome', { name: user?.first_name || t('page.default_user') })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title={t('cards.documents')}
          value={stats?.documents}
          icon={FileText}
          color="green"
        />
        <StatCard
          title={t('cards.unread_notifications')}
          value={stats?.notifications}
          icon={Bell}
          color="yellow"
        />
        <StatCard
          title={t('cards.organizations')}
          value={stats?.organizations}
          icon={Building2}
          color="purple"
        />
      </div>

      {/* Admin-only: Extra stat cards */}
      {isAdmin && stats?.total_users !== undefined && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title={t('cards.total_users')}
            value={stats.total_users}
            icon={Users}
            color="blue"
          />
          <StatCard
            title={t('cards.ai_anomalies')}
            value={stats.anomalies_total}
            icon={ShieldAlert}
            color="red"
          />
          <StatCard
            title={t('cards.unresolved')}
            value={stats.anomalies_unresolved}
            icon={AlertTriangle}
            color="yellow"
            pulsating={stats.anomalies_critical > 0}
          />
          <StatCard
            title={t('cards.critical_anomalies')}
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
        {/* Confessions breakdown */}
        {isAdmin && stats?.confessions && Object.keys(stats.confessions).length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">{t('sections.confessions')}</h3>
            <div className="space-y-2">
              {Object.entries(stats.confessions).map(([name, count]) => (
                <div key={name} className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">{name}</span>
                  <span className="text-sm font-semibold text-text-primary">{t('cards.organization_count', { count })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Admin-only: Breakdown cards */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Document categories */}
          {stats?.document_categories && Object.keys(stats.document_categories).length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">{t('sections.document_categories')}</h3>
              <div className="space-y-2">
                {Object.entries(stats.document_categories).map(([cat, count]) => (
                  <div key={cat} className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">{t(`categories.${cat}`, { defaultValue: cat })}</span>
                    <span className="text-sm font-semibold text-text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users by role */}
          {stats?.users_by_role && Object.keys(stats.users_by_role).length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">{t('sections.by_role')}</h3>
              <div className="space-y-2">
                {Object.entries(stats.users_by_role).map(([role, count]) => (
                  <div key={role} className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">{t(`roles.${role}`, { defaultValue: role })}</span>
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
