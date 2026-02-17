import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ConfessionsListPage from './pages/ConfessionsListPage';
import ConfessionDetailPage from './pages/ConfessionDetailPage';
import CreateConfessionPage from './pages/CreateConfessionPage';
import DocumentsPage from './pages/DocumentsPage';
import NotificationsPage from './pages/NotificationsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import UserManagementPage from './pages/UserManagementPage';
import UserDetailPage from './pages/UserDetailPage';
import OrganizationsPage from './pages/OrganizationsPage';
import PasswordResetRequestPage from './pages/PasswordResetRequestPage';
import PasswordResetConfirmPage from './pages/PasswordResetConfirmPage';
import AIDashboardPage from './pages/AIDashboardPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AuditLogPage from './pages/AuditLogPage';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleBasedRoute from './components/auth/RoleBasedRoute';
import KeySetup from './components/auth/KeySetup';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/password-reset" element={<PasswordResetRequestPage />} />
      <Route path="/password-reset/confirm" element={<PasswordResetConfirmPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <KeySetup>
              <MainLayout />
            </KeySetup>
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="confessions" element={<ConfessionsListPage />} />
        <Route path="confessions/new" element={<CreateConfessionPage />} />
        <Route path="confessions/:id" element={<ConfessionDetailPage />} />
        <Route path="confessions/:id/edit" element={<CreateConfessionPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route
          path="organizations"
          element={
            <RoleBasedRoute allowedRoles={['super_admin', 'qomita_rahbar']}>
              <OrganizationsPage />
            </RoleBasedRoute>
          }
        />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="users"
          element={
            <RoleBasedRoute allowedRoles={['super_admin']}>
              <UserManagementPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="users/:id"
          element={
            <RoleBasedRoute allowedRoles={['super_admin']}>
              <UserDetailPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="ai-dashboard"
          element={
            <RoleBasedRoute allowedRoles={['super_admin', 'qomita_rahbar', 'qomita_xodimi']}>
              <AIDashboardPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <RoleBasedRoute allowedRoles={['super_admin', 'qomita_rahbar', 'qomita_xodimi']}>
              <ReportsPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="audit-log"
          element={
            <RoleBasedRoute allowedRoles={['super_admin', 'qomita_rahbar']}>
              <AuditLogPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <RoleBasedRoute allowedRoles={['super_admin', 'qomita_xodimi']}>
              <SettingsPage />
            </RoleBasedRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
