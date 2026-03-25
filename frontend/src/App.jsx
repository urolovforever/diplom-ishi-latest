import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import NotificationsPage from './pages/NotificationsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import UserManagementPage from './pages/UserManagementPage';
import UserDetailPage from './pages/UserDetailPage';
import OrganizationsPage from './pages/OrganizationsPage';
import PasswordResetRequestPage from './pages/PasswordResetRequestPage';
import PasswordResetConfirmPage from './pages/PasswordResetConfirmPage';
import AdminPanelPage from './pages/AdminPanelPage';
import AIDashboardPage from './pages/AIDashboardPage';
import AuditLogPage from './pages/AuditLogPage';
import SettingsPage from './pages/SettingsPage';
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
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="users"
          element={
            <RoleBasedRoute allowedRoles={['super_admin', 'konfessiya_rahbari', 'dt_rahbar']}>
              <UserManagementPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="users/:id"
          element={
            <RoleBasedRoute allowedRoles={['super_admin', 'konfessiya_rahbari', 'dt_rahbar']}>
              <UserDetailPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="admin-panel"
          element={
            <RoleBasedRoute allowedRoles={['super_admin']}>
              <AdminPanelPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="ai-dashboard"
          element={
            <RoleBasedRoute allowedRoles={['super_admin']}>
              <AIDashboardPage />
            </RoleBasedRoute>
          }
        />
        <Route
          path="audit-log"
          element={
            <RoleBasedRoute allowedRoles={['super_admin']}>
              <AuditLogPage />
            </RoleBasedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
