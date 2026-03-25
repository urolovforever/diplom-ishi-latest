import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import authAPI from '../api/authAPI';
import confessionsAPI from '../api/confessionsAPI';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Pagination from '../components/ui/Pagination';
import FormField from '../components/ui/FormField';
import { addToast } from '../store/uiSlice';
import { required, email as emailValidator } from '../utils/validation';
import { UserPlus, Search } from 'lucide-react';
import { getInitials } from '../utils/helpers';
import { ROLES } from '../utils/constants';

// Rolga mos entity turini aniqlash
const ROLE_ENTITY_MAP = {
  [ROLES.KONFESSIYA_RAHBARI]: 'confession',
  [ROLES.KONFESSIYA_XODIMI]: 'confession',
  [ROLES.DT_RAHBAR]: 'organization',
  [ROLES.DT_XODIMI]: 'organization',
};

function UserManagementPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteForm, setInviteForm] = useState({
    email: '', first_name: '', last_name: '', role_id: '',
    confession_id: '', organization_id: '',
  });
  const [inviteErrors, setInviteErrors] = useState({});
  const [roles, setRoles] = useState([]);
  const [confessions, setConfessions] = useState([]);
  const [organizations, setOrganizations] = useState([]);

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
    authAPI.getRoles().then((res) => {
      setRoles(res.data);
    }).catch(() => {});

    // Fetch confessions
    confessionsAPI.getConfessions().then((res) => {
      const list = res.data?.results || res.data || [];
      setConfessions(list);
    }).catch(() => {});

    // Fetch organizations
    confessionsAPI.getOrganizations().then((res) => {
      const orgs = res.data.results || res.data;
      setOrganizations(orgs);
    }).catch(() => {});
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    const errs = {};
    if (required(inviteForm.email)) errs.email = required(inviteForm.email);
    if (emailValidator(inviteForm.email)) errs.email = emailValidator(inviteForm.email);
    if (required(inviteForm.first_name)) errs.first_name = 'Majburiy maydon';
    if (required(inviteForm.last_name)) errs.last_name = 'Majburiy maydon';
    if (!inviteForm.role_id) errs.role_id = "Rol tanlang";

    const selectedRole = roles.find((r) => r.id === inviteForm.role_id);
    const entityType = selectedRole ? ROLE_ENTITY_MAP[selectedRole.name] : null;

    const isKR = user?.role?.name === ROLES.KONFESSIYA_RAHBARI;
    if (entityType === 'confession' && !isKR && !inviteForm.confession_id) {
      errs.confession_id = "Konfessiya tanlang";
    }
    if (entityType === 'organization' && !inviteForm.organization_id) {
      errs.organization_id = "Tashkilot tanlang";
    }

    if (Object.keys(errs).length) {
      setInviteErrors(errs);
      return;
    }

    try {
      const payload = {
        email: inviteForm.email,
        first_name: inviteForm.first_name,
        last_name: inviteForm.last_name,
        role_id: inviteForm.role_id,
      };
      if (entityType === 'confession') {
        payload.confession_id = isKR ? user.confession : inviteForm.confession_id;
      } else if (entityType === 'organization') {
        payload.organization_id = inviteForm.organization_id;
      }

      await authAPI.inviteUser(payload);
      dispatch(addToast({ type: 'success', message: "Foydalanuvchi yaratildi. Email yuborildi." }));
      setShowInvite(false);
      setInviteForm({ email: '', first_name: '', last_name: '', role_id: '', confession_id: '', organization_id: '' });
      setInviteErrors({});
      fetchUsers();
    } catch (err) {
      const detail = err.response?.data?.email?.[0] || err.response?.data?.role_id?.[0] || "Yaratishda xatolik";
      dispatch(addToast({ type: 'error', message: detail }));
    }
  };

  const handleToggleActive = async (targetUser) => {
    try {
      await authAPI.updateUser(targetUser.id, { is_active: !targetUser.is_active });
      dispatch(addToast({
        type: 'success',
        message: `Foydalanuvchi ${targetUser.is_active ? 'o\'chirildi' : 'faollashtirildi'}`,
      }));
      fetchUsers();
    } catch {
      dispatch(addToast({ type: 'error', message: "Foydalanuvchini yangilashda xatolik" }));
    }
  };

  // Tanlangan rolga mos entity turini aniqlash
  const selectedRole = roles.find((r) => r.id === inviteForm.role_id);
  const entityType = selectedRole ? ROLE_ENTITY_MAP[selectedRole.name] : null;
  const isKonfessiyaRahbari = user?.role?.name === ROLES.KONFESSIYA_RAHBARI;

  // Konfessiya rahbari faqat o'z konfessiyasi ostidagi tashkilotlarni ko'rsin
  const filteredOrganizations = (() => {
    if (user?.role?.name === ROLES.KONFESSIYA_RAHBARI && user.confession) {
      return organizations.filter((org) => org.confession === user.confession || org.confession_name === user.organization_name);
    }
    return organizations;
  })();

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
          Yaratish
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
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {filteredUsers.map((u) => {
              const initials = getInitials(u.first_name, u.last_name);
              return (
                <div key={u.id} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-light/10 rounded-full flex items-center justify-center text-sm font-medium text-primary-light">
                        {initials || 'U'}
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">{u.full_name}</div>
                        <div className="text-xs text-text-secondary">{u.email}</div>
                      </div>
                    </div>
                    <Badge variant={u.is_active ? 'success' : 'danger'}>
                      {u.is_active ? 'Faol' : 'Nofaol'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="info">{u.role?.name || "Rol yo'q"}</Badge>
                      {u.organization_name && (
                        <span className="text-xs text-text-secondary">{u.organization_name}</span>
                      )}
                    </div>
                    {user?.role?.name === 'super_admin' && (
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`text-sm font-medium ${u.is_active ? 'text-danger hover:text-red-700' : 'text-success hover:text-emerald-700'}`}
                      >
                        {u.is_active ? "O'chirish" : "Faollashtirish"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-surface">
                    <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase">Foydalanuvchi</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase">Rol</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase">Tashkilot</th>
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
                        <td className="px-5 py-3 text-text-secondary text-sm">
                          {u.organization_name || '—'}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={u.is_active ? 'success' : 'danger'}>
                            {u.is_active ? 'Faol' : 'Nofaol'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3">
                          {user?.role?.name === 'super_admin' && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`text-sm font-medium ${u.is_active ? 'text-danger hover:text-red-700' : 'text-success hover:text-emerald-700'}`}
                            >
                              {u.is_active ? "O'chirish" : "Faollashtirish"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination count={count} currentPage={page} onPageChange={setPage} />
        </>
      )}

      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Foydalanuvchi yaratish">
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
          <FormField label="Rol" error={inviteErrors.role_id} id="invite-role">
            <select
              id="invite-role"
              value={inviteForm.role_id}
              onChange={(e) => setInviteForm({ ...inviteForm, role_id: e.target.value, confession_id: '', organization_id: '' })}
              className="input-field"
            >
              <option value="">Rol tanlang...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.description || role.name}</option>
              ))}
            </select>
          </FormField>

          {/* Confession dropdown for confession-level roles (yashirish: konfessiya_rahbari uchun) */}
          {entityType === 'confession' && !isKonfessiyaRahbari && (
            <FormField label="Konfessiya" error={inviteErrors.confession_id} id="invite-confession">
              <select
                id="invite-confession"
                value={inviteForm.confession_id}
                onChange={(e) => setInviteForm({ ...inviteForm, confession_id: e.target.value })}
                className="input-field"
              >
                <option value="">Konfessiya tanlang...</option>
                {confessions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FormField>
          )}

          {/* Organization dropdown for org-level roles */}
          {entityType === 'organization' && (
            <FormField label="Tashkilot" error={inviteErrors.organization_id} id="invite-org">
              <select
                id="invite-org"
                value={inviteForm.organization_id}
                onChange={(e) => setInviteForm({ ...inviteForm, organization_id: e.target.value })}
                className="input-field"
              >
                <option value="">Tashkilot tanlang...</option>
                {filteredOrganizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.confession_name || 'N/A'})
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {inviteForm.role_id && selectedRole && ['konfessiya_rahbari', 'dt_rahbar'].includes(selectedRole.name) && (
            <p className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded">
              Bu foydalanuvchi tanlangan {entityType === 'confession' ? 'konfessiya' : 'tashkilot'} rahbari sifatida tayinlanadi
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary">Bekor qilish</button>
            <button type="submit" className="btn-primary">Yaratish</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default UserManagementPage;
