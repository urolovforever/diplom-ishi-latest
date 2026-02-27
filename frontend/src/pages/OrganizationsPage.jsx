import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import confessionsAPI from '../api/confessionsAPI';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import FormField from '../components/ui/FormField';
import { addToast } from '../store/uiSlice';
import { Building2, Plus, Trash2, Users, PlusCircle, X } from 'lucide-react';
import { ROLES } from '../utils/constants';

const CAN_MANAGE = ['super_admin'];

function OrganizationsPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const userRole = user?.role?.name;
  const [organizations, setOrganizations] = useState([]);
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', confession: '' });
  const [formErrors, setFormErrors] = useState({});
  const [showNewConfession, setShowNewConfession] = useState(false);
  const [newConfessionName, setNewConfessionName] = useState('');
  const [creatingConfession, setCreatingConfession] = useState(false);

  const canManage = CAN_MANAGE.includes(userRole) || userRole === 'konfessiya_rahbari';

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await confessionsAPI.getOrganizations();
      const orgs = res.data.results || res.data;
      setOrganizations(orgs);
    } catch {
      dispatch(addToast({ type: 'error', message: "Tashkilotlarni yuklashda xatolik" }));
    }
    setLoading(false);
  }, [dispatch]);

  const fetchConfessions = useCallback(async () => {
    try {
      const res = await confessionsAPI.getConfessions();
      const list = res.data.results || res.data;
      setConfessions(list);
    } catch {
      // Confessions may not be accessible for non-admin users
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
    fetchConfessions();
  }, [fetchOrganizations, fetchConfessions]);

  const handleCreateConfession = async () => {
    if (!newConfessionName.trim()) return;
    setCreatingConfession(true);
    try {
      const res = await confessionsAPI.createConfession({ name: newConfessionName.trim() });
      const created = res.data;
      dispatch(addToast({ type: 'success', message: "Konfessiya yaratildi" }));
      setNewConfessionName('');
      setShowNewConfession(false);
      await fetchConfessions();
      if (created?.id) {
        setForm((prev) => ({ ...prev, confession: created.id }));
      }
    } catch (err) {
      const detail = err.response?.data?.name?.[0] || err.response?.data?.detail || "Konfessiya yaratishda xatolik";
      dispatch(addToast({ type: 'error', message: detail }));
    } finally {
      setCreatingConfession(false);
    }
  };

  // Group organizations by confession
  const groupedOrgs = {};
  organizations.forEach((org) => {
    const confName = org.confession_name || 'Boshqa';
    if (!groupedOrgs[confName]) groupedOrgs[confName] = [];
    groupedOrgs[confName].push(org);
  });

  const handleOpenCreate = () => {
    setForm({ name: '', description: '', confession: '' });
    setFormErrors({});
    setShowNewConfession(false);
    setNewConfessionName('');
    setShowCreate(true);
  };

  const isKonfessiyaRahbari = userRole === ROLES.KONFESSIYA_RAHBARI;

  const handleCreate = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Nomi majburiy";
    if (!isKonfessiyaRahbari && !form.confession) errs.confession = "Konfessiya majburiy";
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    try {
      await confessionsAPI.createOrganization({
        name: form.name,
        description: form.description,
        confession: isKonfessiyaRahbari ? user.confession : form.confession,
      });
      dispatch(addToast({ type: 'success', message: "Tashkilot yaratildi" }));
      setShowCreate(false);
      fetchOrganizations();
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || "Tashkilotni yaratishda xatolik";
      dispatch(addToast({ type: 'error', message: detail }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu tashkilotni o'chirishni xohlaysizmi?")) return;
    try {
      await confessionsAPI.deleteOrganization(id);
      dispatch(addToast({ type: 'success', message: "Tashkilot o'chirildi" }));
      fetchOrganizations();
    } catch {
      dispatch(addToast({ type: 'error', message: "Tashkilotni o'chirishda xatolik" }));
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Tashkilotlar</h1>
          <p className="text-sm text-text-secondary mt-1">Konfessiya bo'yicha tashkilotlar ro'yxati</p>
        </div>
        {canManage && (
          <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Tashkilot yaratish
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : organizations.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={40} className="mx-auto mb-3 text-text-secondary/30" />
          <p className="text-text-secondary">Tashkilotlar topilmadi</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedOrgs).map(([confName, orgs]) => (
            <div key={confName}>
              <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Badge variant="warning">{confName}</Badge>
                <span className="text-sm text-text-secondary font-normal">({orgs.length} tashkilot)</span>
              </h2>
              <div className="space-y-2">
                {orgs.map((org) => (
                  <div key={org.id} className="card-hover p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-text-primary">{org.name}</h3>
                        {org.description && (
                          <p className="text-sm text-text-secondary mt-1 line-clamp-2">{org.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-sm text-text-secondary">
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {org.leader ? (
                              <>Rahbar: {org.leader.full_name || org.leader.email}</>
                            ) : (
                              <span className="text-yellow-600">Rahbar tayinlanmagan</span>
                            )}
                          </span>
                          {org.members_count !== undefined && (
                            <span>{org.members_count} a'zo</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canManage && (
                          <button
                            onClick={() => handleDelete(org.id)}
                            className="flex items-center gap-1 text-sm text-danger hover:text-red-700 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Organization Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Tashkilot yaratish">
        <form onSubmit={handleCreate} className="space-y-3">
          {!isKonfessiyaRahbari && (
            <div>
              <FormField label="Konfessiya" error={formErrors.confession} id="org-confession">
                <div className="flex items-center gap-2">
                  <select
                    id="org-confession"
                    value={form.confession}
                    onChange={(e) => setForm({ ...form, confession: e.target.value })}
                    className="input-field flex-1"
                  >
                    <option value="">Konfessiya tanlang...</option>
                    {confessions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewConfession(!showNewConfession)}
                    className="p-2 text-primary-light hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                    title="Yangi konfessiya yaratish"
                  >
                    {showNewConfession ? <X size={18} /> : <PlusCircle size={18} />}
                  </button>
                </div>
              </FormField>
              {showNewConfession && (
                <div className="mt-2 p-3 bg-surface rounded-xl space-y-2">
                  <p className="text-xs font-medium text-text-secondary">Yangi konfessiya yaratish</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newConfessionName}
                      onChange={(e) => setNewConfessionName(e.target.value)}
                      className="input-field flex-1"
                      placeholder="Konfessiya nomi..."
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateConfession(); } }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateConfession}
                      disabled={creatingConfession || !newConfessionName.trim()}
                      className="btn-primary text-sm px-3 py-2 flex-shrink-0"
                    >
                      {creatingConfession ? '...' : 'Yaratish'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <FormField label="Nomi" error={formErrors.name} id="org-name">
            <input id="org-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </FormField>
          <FormField label="Tavsif" id="org-desc">
            <textarea id="org-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={3} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Bekor qilish</button>
            <button type="submit" className="btn-primary">Yaratish</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default OrganizationsPage;
