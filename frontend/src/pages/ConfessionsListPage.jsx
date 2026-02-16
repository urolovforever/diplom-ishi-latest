import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchConfessions } from '../store/confessionsSlice';
import { CONFESSION_STATUS } from '../utils/constants';
import { formatDate } from '../utils/helpers';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

function ConfessionsListPage() {
  const dispatch = useDispatch();
  const { list, count, loading } = useSelector((state) => state.confessions);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    dispatch(fetchConfessions(params));
  }, [dispatch, statusFilter]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Confessions</h1>
        <Link
          to="/confessions/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          New Confession
        </Link>
      </div>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="">All Statuses</option>
          {Object.entries(CONFESSION_STATUS).map(([key, value]) => (
            <option key={value} value={value}>
              {key.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Organization</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {list.map((confession) => (
                <tr key={confession.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/confessions/${confession.id}`} className="text-blue-600 hover:underline">
                      {confession.title}
                    </Link>
                    {confession.is_anonymous && (
                      <span className="ml-2 text-xs text-gray-400">(anonymous)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {confession.organization_name}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[confession.status] || ''}`}>
                      {confession.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(confession.created_at)}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                    No confessions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {count > 0 && (
            <div className="px-4 py-3 bg-gray-50 text-sm text-gray-500">
              {count} confession{count !== 1 ? 's' : ''} total
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ConfessionsListPage;
