import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeToast } from '../../store/uiSlice';

const typeStyles = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
};

function ToastContainer() {
  const toasts = useSelector((state) => state.ui.toasts);
  const dispatch = useDispatch();

  useEffect(() => {
    if (toasts.length === 0) return;
    const latest = toasts[toasts.length - 1];
    const timer = setTimeout(() => {
      dispatch(removeToast(latest.id));
    }, 4000);
    return () => clearTimeout(timer);
  }, [toasts, dispatch]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${typeStyles[toast.type] || typeStyles.info} text-white px-4 py-3 rounded shadow-lg flex items-center justify-between min-w-[300px]`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => dispatch(removeToast(toast.id))}
            className="ml-4 text-white hover:text-gray-200"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
