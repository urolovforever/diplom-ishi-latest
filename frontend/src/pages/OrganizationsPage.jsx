import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import confessionsAPI from '../api/confessionsAPI';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import FormField from '../components/ui/FormField';
import { addToast } from '../store/uiSlice';
import { Building2, Plus, Trash2, Users, FileText } from 'lucide-react';

function OrganizationsPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState({});

  const isAdmin = user?.role?.name === 'super_admin' || user?.role?.name === 'qomita_rahbar';

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await confessionsAPI.getOrganizations();
      setOrganizations(res.data.results || res.data);
    } catch {
      dispatch(addToast({ type: 'error', message: "Tashkilotlarni yuklashda xatolik" }));
    }
    setLoading(false);
  }, [dispatch]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Nomi majburiy";
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    try {
      await confessionsAPI.createOrganization(form);
      dispatch(addToast({ type: 'success', message: "Tashkilot yaratildi" }));
      setShowCreate(false);
      setForm({ name: '', description: '' });
      setFormErrors({});
      fetchOrganizations();
    } catch {
      dispatch(addToast({ type: 'error', message: "Tashkilotni yaratishda xatolik" }));
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
          <p className="text-sm text-text-secondary mt-1">Barcha ro'yxatga olingan tashkilotlar</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <div key={org.id} className="card-hover p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-text-primary">{org.name}</h3>
                <Badge variant="info">{org.confession_count || 0} konfessiya</Badge>
              </div>
              {org.description && (
                <p className="text-sm text-text-secondary mt-1 line-clamp-2">{org.description}</p>
              )}
              <div className="mt-3 flex items-center gap-1 text-sm text-text-secondary">
                <Users size={14} />
                {org.leader ? (
                  <span>Rahbar: {org.leader.full_name || org.leader.email}</span>
                ) : (
                  <span>Rahbar tayinlanmagan</span>
                )}
              </div>
              {isAdmin && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleDelete(org.id)}
                    className="flex items-center gap-1.5 text-sm text-danger hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={14} />
                    O'chirish
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Tashkilot yaratish">
        <form onSubmit={handleCreate} className="space-y-3">
          <FormField label="Nomi" error={formErrors.name} id="org-name">
            <input id="org-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </FormField>
          <FormField label="Tavsif" error={formErrors.description} id="org-desc">
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
