import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotifications,
  fetchUnreadCount,
  markRead,
  deleteNotification,
} from '../store/notificationsSlice';
import { formatDateTime } from '../utils/helpers';
import { Bell, AlertTriangle, Info, AlertCircle, CheckCheck, Trash2, Cpu } from 'lucide-react';

const TYPE_CONFIG = {
  info: { icon: Info, bg: 'bg-blue-50', color: 'text-primary-light' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50', color: 'text-warning' },
  alert: { icon: AlertCircle, bg: 'bg-red-50', color: 'text-danger' },
  system: { icon: Cpu, bg: 'bg-purple-50', color: 'text-purple-600' },
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">Bildirishnomalar</h1>
          {unreadCount > 0 && (
            <span className="bg-danger text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-secondary flex items-center gap-2 text-sm">
            <CheckCheck size={16} />
            Hammasini o'qilgan deb belgilash
          </button>
        )}
      </div>

      <div className="mb-4">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-field max-w-xs">
          <option value="">Barchasi</option>
          <option value="unread">O'qilmagan</option>
          <option value="read">O'qilgan</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((notif) => {
            const config = TYPE_CONFIG[notif.notification_type] || TYPE_CONFIG.info;
            const Icon = config.icon;
            return (
              <div
                key={notif.id}
                className={`card p-4 flex items-start gap-4 transition-all ${
                  !notif.is_read ? 'border-l-4 border-primary-light bg-blue-50/30' : ''
                }`}
              >
                <div className={`p-2 rounded-xl ${config.bg} flex-shrink-0`}>
                  <Icon size={18} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-medium ${!notif.is_read ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {notif.title}
                  </h3>
                  <p className="text-sm text-text-secondary mt-0.5">{notif.message}</p>
                  <p className="text-xs text-text-secondary/70 mt-1">{formatDateTime(notif.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkOneRead(notif.id)}
                      className="p-1.5 text-primary-light hover:bg-blue-50 rounded-lg transition-colors"
                      title="O'qilgan deb belgilash"
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="p-1.5 text-danger hover:bg-red-50 rounded-lg transition-colors"
                    title="O'chirish"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="card p-12 text-center">
              <Bell size={40} className="mx-auto mb-3 text-text-secondary/30" />
              <p className="text-text-secondary">Bildirishnomalar yo'q</p>
            </div>
          )}
          {count > 0 && (
            <p className="text-sm text-text-secondary text-center pt-2">Jami {count} ta bildirishnoma</p>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
