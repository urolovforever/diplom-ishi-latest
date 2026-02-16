import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchDashboardStats } from '../store/confessionsSlice';

function DashboardPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { stats } = useSelector((state) => state.confessions);

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">
          Welcome, {user?.first_name || 'User'}!
        </h2>
        <p className="text-gray-600">
          Secure Confession Platform — manage confessions, documents, and organizational data securely.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Link to="/confessions" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Confessions</h3>
          <p className="text-3xl font-bold mt-2">{stats?.confessions ?? '-'}</p>
        </Link>
        <Link to="/documents" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Documents</h3>
          <p className="text-3xl font-bold mt-2">{stats?.documents ?? '-'}</p>
        </Link>
        <Link to="/notifications" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Unread Notifications</h3>
          <p className="text-3xl font-bold mt-2">{stats?.notifications ?? '-'}</p>
        </Link>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Organizations</h3>
          <p className="text-3xl font-bold mt-2">{stats?.organizations ?? '-'}</p>
        </div>
      </div>

      {stats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Confessions by Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-2xl font-bold">{stats.confessions_draft ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Draft</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded">
              <p className="text-2xl font-bold text-blue-700">{stats.confessions_submitted ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Submitted</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded">
              <p className="text-2xl font-bold text-yellow-700">{stats.confessions_under_review ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Under Review</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <p className="text-2xl font-bold text-green-700">{stats.confessions_approved ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Approved</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <p className="text-2xl font-bold text-red-700">{stats.confessions_rejected ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Rejected</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
