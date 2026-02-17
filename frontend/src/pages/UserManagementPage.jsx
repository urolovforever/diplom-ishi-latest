import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import authAPI from '../api/authAPI';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Pagination from '../components/ui/Pagination';
import FormField from '../components/ui/FormField';
import { addToast } from '../store/uiSlice';
import { required, email as emailValidator, passwordStrength } from '../utils/validation';
import { UserPlus, Search } from 'lucide-react';
import { getInitials } from '../utils/helpers';

function UserManagementPage() {
  const dispatch = useDispatch();
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteForm, setInviteForm] = useState({
    email: '', first_name: '', last_name: '', password: '', role_id: '',
  });
  const [inviteErrors, setInviteErrors] = useState({});
  const [roles, setRoles] = useState([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authAPI.getUsers({ page });
      setUsers(res.data.results || res.data);
      setCount(res.data.count || 0);
    } catch {
      dispatch(addToast({ type: 'error', message: "Foydalanuvchilarni yuklashda xatolik" }));
    }
    setLoading(false);
  }, [page, dispatch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const roleMap = {};
    users.forEach((u) => {
      if (u.role) roleMap[u.role.id] = u.role;
    });
    setRoles(Object.values(roleMap));
  }, [users]);

  const handleInvite = async (e) => {
    e.preventDefault();
    const errs = {};
    if (required(inviteForm.email)) errs.email = required(inviteForm.email);
    if (emailValidator(inviteForm.email)) errs.email = emailValidator(inviteForm.email);
    if (required(inviteForm.first_name)) errs.first_name = 'Majburiy maydon';
    if (required(inviteForm.last_name)) errs.last_name = 'Majburiy maydon';
    const pwErr = passwordStrength(inviteForm.password);
    if (pwErr) errs.password = pwErr;
    if (!inviteForm.role_id) errs.role_id = "Rol tanlang";
    if (Object.keys(errs).length) {
      setInviteErrors(errs);
      return;
    }
    try {
      await authAPI.inviteUser(inviteForm);
      dispatch(addToast({ type: 'success', message: "Foydalanuvchi muvaffaqiyatli taklif qilindi" }));
      setShowInvite(false);
      setInviteForm({ email: '', first_name: '', last_name: '', password: '', role_id: '' });
      setInviteErrors({});
      fetchUsers();
    } catch (err) {
      const detail = err.response?.data?.email?.[0] || "Taklif yuborishda xatolik";
      dispatch(addToast({ type: 'error', message: detail }));
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await authAPI.updateUser(user.id, { is_active: !user.is_active });
      dispatch(addToast({
        type: 'success',
        message: `Foydalanuvchi ${user.is_active ? 'o\'chirildi' : 'faollashtirildi'}`,
      }));
      fetchUsers();
    } catch {
      dispatch(addToast({ type: 'error', message: "Foydalanuvchini yangilashda xatolik" }));
    }
  };

  const filteredUsers = searchQuery
    ? users.filter((u) =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Foydalanuvchilar boshqaruvi</h1>
          <p className="text-sm text-text-secondary mt-1">
            {count > 0 ? `Jami ${count} ta foydalanuvchi` : "Barcha foydalanuvchilar"}
          </p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={18} />
          Taklif qilish
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="bg-surface">
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase">Foydalanuvchi</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase">Rol</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase">Holat</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((u) => {
                  const initials = getInitials(u.first_name, u.last_name);
                  return (
                    <tr key={u.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-light/10 rounded-full flex items-center justify-center text-xs font-medium text-primary-light">
                            {initials || 'U'}
                          </div>
                          <span className="font-medium text-text-primary">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-text-secondary text-sm">{u.email}</td>
                      <td className="px-5 py-3">
                        <Badge variant="info">{u.role?.name || "Rol yo'q"}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={u.is_active ? 'success' : 'danger'}>
                          {u.is_active ? 'Faol' : 'Nofaol'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`text-sm font-medium ${u.is_active ? 'text-danger hover:text-red-700' : 'text-success hover:text-emerald-700'}`}
                        >
                          {u.is_active ? "O'chirish" : "Faollashtirish"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination count={count} currentPage={page} onPageChange={setPage} />
        </>
      )}

      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Foydalanuvchini taklif qilish">
        <form onSubmit={handleInvite} className="space-y-3">
          <FormField label="Email" error={inviteErrors.email} id="invite-email">
            <input id="invite-email" type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className="input-field" />
          </FormField>
          <FormField label="Ism" error={inviteErrors.first_name} id="invite-first">
            <input id="invite-first" type="text" value={inviteForm.first_name} onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })} className="input-field" />
          </FormField>
          <FormField label="Familiya" error={inviteErrors.last_name} id="invite-last">
            <input id="invite-last" type="text" value={inviteForm.last_name} onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })} className="input-field" />
          </FormField>
          <FormField label="Parol" error={inviteErrors.password} id="invite-password">
            <input id="invite-password" type="password" value={inviteForm.password} onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })} className="input-field" />
          </FormField>
          <FormField label="Rol" error={inviteErrors.role_id} id="invite-role">
            <select id="invite-role" value={inviteForm.role_id} onChange={(e) => setInviteForm({ ...inviteForm, role_id: e.target.value })} className="input-field">
              <option value="">Rol tanlang...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary">Bekor qilish</button>
            <button type="submit" className="btn-primary">Taklif qilish</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default UserManagementPage;
