import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUnreadCount, markRead } from '../store/notificationsSlice';

export function useNotification() {
  const dispatch = useDispatch();
  const { unreadCount } = useSelector((state) => state.notifications);

  useEffect(() => {
    dispatch(fetchUnreadCount());
    const interval = setInterval(() => dispatch(fetchUnreadCount()), 60000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const markAllRead = useCallback(() => {
    dispatch(markRead({ all: true }));
  }, [dispatch]);

  const markAsRead = useCallback((ids) => {
    dispatch(markRead({ ids }));
  }, [dispatch]);

  return {
    unreadCount,
    markAllRead,
    markAsRead,
  };
}
