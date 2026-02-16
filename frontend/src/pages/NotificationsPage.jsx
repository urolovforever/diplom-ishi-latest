import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotifications,
  fetchUnreadCount,
  markRead,
  deleteNotification,
} from '../store/notificationsSlice';
import { formatDateTime } from '../utils/helpers';

const TYPE_COLORS = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-yellow-100 text-yellow-700',
  alert: 'bg-red-100 text-red-700',
  system: 'bg-purple-100 text-purple-700',
};

function NotificationsPage() {
  const dispatch = useDispatch();
  const { list, count, unreadCount, loading } = useSelector((state) => state.notifications);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = {};
    if (filter) params.is_read = filter === 'read' ? 'true' : 'false';
    dispatch(fetchNotifications(params));
    dispatch(fetchUnreadCount());
  }, [dispatch, filter]);

  const handleMarkAllRead = async () => {
    await dispatch(markRead({ all: true }));
    dispatch(fetchNotifications());
    dispatch(fetchUnreadCount());
  };

  const handleDelete = async (id) => {
    await dispatch(deleteNotification(id));
  };

  const handleMarkOneRead = async (id) => {
    await dispatch(markRead({ ids: [id] }));
    dispatch(fetchNotifications());
    dispatch(fetchUnreadCount());
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-3">
          {list.map((notif) => (
            <div
              key={notif.id}
              className={`bg-white rounded-lg shadow p-4 flex justify-between items-start ${
                !notif.is_read ? 'border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`text-sm font-medium ${!notif.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                    {notif.title}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${TYPE_COLORS[notif.notification_type] || ''}`}>
                    {notif.notification_type}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{notif.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDateTime(notif.created_at)}</p>
              </div>
              <div className="flex gap-2 ml-4">
                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkOneRead(notif.id)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => handleDelete(notif.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No notifications.
            </div>
          )}
          {count > 0 && (
            <p className="text-sm text-gray-500">{count} notification{count !== 1 ? 's' : ''} total</p>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
