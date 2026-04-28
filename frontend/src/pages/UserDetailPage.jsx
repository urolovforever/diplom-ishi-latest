import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import authAPI from '../api/authAPI';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { addToast } from '../store/uiSlice';

function UserDetailPage() {
  const { t } = useTranslation('users');
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await authAPI.getUser(id);
        setUser(res.data);
        setForm({
          first_name: res.data.first_name,
          last_name: res.data.last_name,
          is_active: res.data.is_active,
        });
      } catch {
        dispatch(addToast({ type: 'error', message: t('errors.load_user_failed') }));
        navigate('/users');
      }
      setLoading(false);
    };
    fetchUser();
  }, [id, dispatch, navigate, t]);

  const handleSave = async () => {
    try {
      const res = await authAPI.updateUser(id, form);
      setUser(res.data);
      setEditing(false);
      dispatch(addToast({ type: 'success', message: t('toasts.user_updated') }));
    } catch {
      dispatch(addToast({ type: 'error', message: t('errors.update_user_failed') }));
    }
  };

  const handleToggleActive = async () => {
    try {
      const res = await authAPI.updateUser(id, { is_active: !user.is_active });
      setUser(res.data);
      dispatch(addToast({
        type: 'success',
        message: user.is_active ? t('toasts.user_deactivated') : t('toasts.user_activated'),
      }));
    } catch {
      dispatch(addToast({ type: 'error', message: t('errors.update_user_failed') }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/users')}
            className="text-gray-500 hover:text-gray-700"
          >
            &larr; {t('detail.back')}
          </button>
          <h1 className="text-2xl font-bold">{t('detail.title')}</h1>
        </div>
        <div className="flex space-x-2">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                {t('detail.cancel')}
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {t('detail.save')}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {t('detail.edit')}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{t('detail.first_name')}</label>
            {editing ? (
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            ) : (
              <p className="text-lg">{user.first_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{t('detail.last_name')}</label>
            {editing ? (
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            ) : (
              <p className="text-lg">{user.last_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{t('detail.email')}</label>
            <p className="text-lg">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{t('detail.role')}</label>
            <Badge variant="info">{user.role?.name || t('detail.no_role')}</Badge>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{t('detail.status')}</label>
            <Badge variant={user.is_active ? 'success' : 'danger'}>
              {user.is_active ? t('detail.active') : t('detail.inactive')}
            </Badge>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{t('detail.twofa_label')}</label>
            <Badge variant={user.is_2fa_enabled ? 'success' : 'warning'}>
              {user.is_2fa_enabled ? t('detail.enabled') : t('detail.disabled')}
            </Badge>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{t('detail.created')}</label>
            <p className="text-lg">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{t('detail.updated')}</label>
            <p className="text-lg">{new Date(user.updated_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4">{t('detail.actions')}</h3>
          <button
            onClick={handleToggleActive}
            className={`px-4 py-2 rounded text-white ${
              user.is_active
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {user.is_active ? t('detail.deactivate_button') : t('detail.activate_button')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserDetailPage;
