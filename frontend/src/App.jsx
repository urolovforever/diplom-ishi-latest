import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ConfessionsListPage from './pages/ConfessionsListPage';
import ConfessionDetailPage from './pages/ConfessionDetailPage';
import CreateConfessionPage from './pages/CreateConfessionPage';
import DocumentsPage from './pages/DocumentsPage';
import NotificationsPage from './pages/NotificationsPage';
import NotFoundPage from './pages/NotFoundPage';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="confessions" element={<ConfessionsListPage />} />
        <Route path="confessions/new" element={<CreateConfessionPage />} />
        <Route path="confessions/:id" element={<ConfessionDetailPage />} />
        <Route path="confessions/:id/edit" element={<CreateConfessionPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
