import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import confessionsAPI from '../api/confessionsAPI';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import FormField from '../components/ui/FormField';
import { addToast } from '../store/uiSlice';
import { Building2, Plus, Trash2, Users, ChevronDown, ChevronRight } from 'lucide-react';

const ORG_TYPE_LABELS = {
  qomita: "Qo'mita",
  konfessiya: 'Konfessiya',
  diniy_tashkilot: 'Diniy Tashkilot',
};

const ORG_TYPE_COLORS = {
  qomita: 'info',
  konfessiya: 'warning',
  diniy_tashkilot: 'success',
};

const CAN_MANAGE = ['super_admin', 'qomita_rahbar'];

function OrganizationNode({ org, onDelete, userRole, level = 0 }) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = org.children && org.children.length > 0;
  const canManage = CAN_MANAGE.includes(userRole);

  return (
    <div className={`${level > 0 ? 'ml-6 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="card-hover p-4 mb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button onClick={() => setExpanded(!expanded)} className="text-text-secondary hover:text-text-primary">
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
              <div className="w-4" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-primary">{org.name}</h3>
                <Badge variant={ORG_TYPE_COLORS[org.org_type] || 'info'}>
                  {ORG_TYPE_LABELS[org.org_type] || org.org_type}
                </Badge>
              </div>
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
                {hasChildren && (
                  <span>{org.children.length} pastki tashkilot</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => onDelete(org.id)}
                className="flex items-center gap-1 text-sm text-danger hover:text-red-700 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="mt-1">
          {org.children.map((child) => (
            <OrganizationNode
              key={child.id}
              org={child}
              onDelete={onDelete}
              userRole={userRole}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrganizationsPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const userRole = user?.role?.name;
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', org_type: '', parent: '' });
  const [formErrors, setFormErrors] = useState({});

  const canManage = CAN_MANAGE.includes(userRole);
  const canCreateQomita = userRole === 'super_admin';
  const canCreateKonfessiya = CAN_MANAGE.includes(userRole);
  const canCreateDT = CAN_MANAGE.includes(userRole) || userRole === 'konfessiya_rahbari';

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

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Build hierarchical tree from flat list
  const buildTree = (orgs) => {
    const topLevel = orgs.filter((o) => !o.parent);
    if (topLevel.length > 0 && topLevel[0].children) {
      return topLevel;
    }
    const orgMap = {};
    orgs.forEach((o) => { orgMap[o.id] = { ...o, children: [] }; });
    const roots = [];
    orgs.forEach((o) => {
      if (o.parent && orgMap[o.parent]) {
        orgMap[o.parent].children.push(orgMap[o.id]);
      } else {
        roots.push(orgMap[o.id]);
      }
    });
    return roots;
  };

  const tree = buildTree(organizations);

  const getCreateDefaults = () => {
    if (canCreateQomita) return { org_type: 'qomita' };
    if (canCreateKonfessiya) return { org_type: 'konfessiya' };
    if (canCreateDT) return { org_type: 'diniy_tashkilot' };
    return {};
  };

  const handleOpenCreate = () => {
    const defaults = getCreateDefaults();
    setForm({ name: '', description: '', org_type: defaults.org_type || '', parent: '' });
    setFormErrors({});
    setShowCreate(true);
  };

  const getAvailableOrgTypes = () => {
    const types = [];
    if (canCreateQomita) types.push({ value: 'qomita', label: "Qo'mita" });
    if (canCreateKonfessiya) types.push({ value: 'konfessiya', label: 'Konfessiya' });
    if (canCreateDT) types.push({ value: 'diniy_tashkilot', label: 'Diniy Tashkilot' });
    return types;
  };

  const getParentOptions = () => {
    if (form.org_type === 'konfessiya') {
      return organizations.filter((o) => o.org_type === 'qomita');
    }
    if (form.org_type === 'diniy_tashkilot') {
      return organizations.filter((o) => o.org_type === 'konfessiya');
    }
    return [];
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Nomi majburiy";
    if (!form.org_type) errs.org_type = "Turi majburiy";
    if (form.org_type !== 'qomita' && !form.parent) errs.parent = "Yuqori tashkilot majburiy";
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    try {
      const payload = {
        name: form.name,
        description: form.description,
        org_type: form.org_type,
      };
      if (form.parent) payload.parent = form.parent;
      await confessionsAPI.createOrganization(payload);
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
          <p className="text-sm text-text-secondary mt-1">Ierarxik tashkilot tuzilmasi</p>
        </div>
        {(canCreateQomita || canCreateKonfessiya || canCreateDT) && (
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
      ) : tree.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={40} className="mx-auto mb-3 text-text-secondary/30" />
          <p className="text-text-secondary">Tashkilotlar topilmadi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tree.map((org) => (
            <OrganizationNode
              key={org.id}
              org={org}
              onDelete={handleDelete}
              userRole={userRole}
            />
          ))}
        </div>
      )}

      {/* Create Organization Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Tashkilot yaratish">
        <form onSubmit={handleCreate} className="space-y-3">
          <FormField label="Turi" error={formErrors.org_type} id="org-type">
            <select
              id="org-type"
              value={form.org_type}
              onChange={(e) => setForm({ ...form, org_type: e.target.value, parent: '' })}
              className="input-field"
            >
              <option value="">Turini tanlang...</option>
              {getAvailableOrgTypes().map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </FormField>
          {form.org_type && form.org_type !== 'qomita' && (
            <FormField label="Yuqori tashkilot" error={formErrors.parent} id="org-parent">
              <select
                id="org-parent"
                value={form.parent}
                onChange={(e) => setForm({ ...form, parent: e.target.value })}
                className="input-field"
              >
                <option value="">Tanlang...</option>
                {getParentOptions().map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </FormField>
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
