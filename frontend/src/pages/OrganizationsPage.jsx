import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import confessionsAPI from '../api/confessionsAPI';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import FormField from '../components/ui/FormField';
import { addToast } from '../store/uiSlice';
import { Building2, Plus, Trash2, Users, PlusCircle, X, BookOpen, Search, Filter } from 'lucide-react';
import { ROLES } from '../utils/constants';

const CAN_MANAGE = ['super_admin'];

function OrganizationsPage() {
  const { t } = useTranslation('organizations');
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const userRole = user?.role?.name;
  const [organizations, setOrganizations] = useState([]);
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConfession, setSelectedConfession] = useState('');

  // Organization create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', confession: '' });
  const [formErrors, setFormErrors] = useState({});
  const [showNewConfession, setShowNewConfession] = useState(false);
  const [newConfessionName, setNewConfessionName] = useState('');
  const [creatingConfession, setCreatingConfession] = useState(false);

  // Confession create modal
  const [showConfessionModal, setShowConfessionModal] = useState(false);
  const [confessionForm, setConfessionForm] = useState({ name: '', description: '' });
  const [confessionFormErrors, setConfessionFormErrors] = useState({});
  const [creatingConfessionModal, setCreatingConfessionModal] = useState(false);

  const isSuperAdmin = userRole === 'super_admin';
  const canManage = CAN_MANAGE.includes(userRole) || userRole === 'konfessiya_rahbari';

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await confessionsAPI.getOrganizations();
      const orgs = res.data.results || res.data;
      setOrganizations(orgs);
    } catch {
      dispatch(addToast({ type: 'error', message: t('errors.organizations_load_failed') }));
    }
    setLoading(false);
  }, [dispatch, t]);

  const fetchConfessions = useCallback(async () => {
    try {
      const res = await confessionsAPI.getConfessions();
      const list = res.data.results || res.data;
      setConfessions(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
    fetchConfessions();
  }, [fetchOrganizations, fetchConfessions]);

  // Filtered confessions
  const filteredConfessions = useMemo(() => {
    if (!searchQuery) return confessions;
    const q = searchQuery.toLowerCase();
    return confessions.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.leader?.full_name?.toLowerCase().includes(q)
    );
  }, [confessions, searchQuery]);

  // Filtered organizations
  const filteredOrganizations = useMemo(() => {
    let filtered = organizations;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (org) =>
          org.name?.toLowerCase().includes(q) ||
          org.description?.toLowerCase().includes(q) ||
          org.confession_name?.toLowerCase().includes(q) ||
          org.leader?.full_name?.toLowerCase().includes(q)
      );
    }
    if (selectedConfession) {
      filtered = filtered.filter(
        (org) => org.confession_name === selectedConfession
      );
    }
    return filtered;
  }, [organizations, searchQuery, selectedConfession]);

  // Group filtered organizations by confession
  const groupedOrgs = useMemo(() => {
    const groups = {};
    filteredOrganizations.forEach((org) => {
      const confName = org.confession_name || t('cards.other_group');
      if (!groups[confName]) groups[confName] = [];
      groups[confName].push(org);
    });
    return groups;
  }, [filteredOrganizations, t]);

  // Unique confession names for filter dropdown
  const confessionNames = useMemo(() => {
    const names = new Set();
    organizations.forEach((org) => {
      if (org.confession_name) names.add(org.confession_name);
    });
    return Array.from(names).sort();
  }, [organizations]);

  // Inline confession creation (inside org modal)
  const handleCreateConfessionInline = async () => {
    if (!newConfessionName.trim()) return;
    setCreatingConfession(true);
    try {
      const res = await confessionsAPI.createConfession({ name: newConfessionName.trim() });
      const created = res.data;
      dispatch(addToast({ type: 'success', message: t('toasts.confession_created') }));
      setNewConfessionName('');
      setShowNewConfession(false);
      await fetchConfessions();
      if (created?.id) {
        setForm((prev) => ({ ...prev, confession: created.id }));
      }
    } catch (err) {
      const detail = err.response?.data?.name?.[0] || err.response?.data?.detail || t('errors.confession_creation_failed');
      dispatch(addToast({ type: 'error', message: detail }));
    } finally {
      setCreatingConfession(false);
    }
  };

  // Confession modal create
  const handleOpenConfessionModal = () => {
    setConfessionForm({ name: '', description: '' });
    setConfessionFormErrors({});
    setShowConfessionModal(true);
  };

  const handleCreateConfessionModal = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!confessionForm.name.trim()) errs.name = t('form.errors.name_required');
    if (Object.keys(errs).length) { setConfessionFormErrors(errs); return; }
    setCreatingConfessionModal(true);
    try {
      await confessionsAPI.createConfession({
        name: confessionForm.name.trim(),
        description: confessionForm.description.trim(),
      });
      dispatch(addToast({ type: 'success', message: t('toasts.confession_created') }));
      setShowConfessionModal(false);
      fetchConfessions();
    } catch (err) {
      const detail = err.response?.data?.name?.[0] || err.response?.data?.detail || t('errors.confession_creation_failed');
      dispatch(addToast({ type: 'error', message: detail }));
    } finally {
      setCreatingConfessionModal(false);
    }
  };

  const handleDeleteConfession = async (id) => {
    if (!window.confirm(t('dialogs.confirm_confession_delete'))) return;
    try {
      await confessionsAPI.deleteConfession(id);
      dispatch(addToast({ type: 'success', message: t('toasts.confession_deleted') }));
      fetchConfessions();
      fetchOrganizations();
    } catch {
      dispatch(addToast({ type: 'error', message: t('errors.confession_deletion_failed') }));
    }
  };

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
    if (!form.name.trim()) errs.name = t('form.errors.name_required');
    if (!isKonfessiyaRahbari && !form.confession) errs.confession = t('form.errors.confession_required');
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    try {
      await confessionsAPI.createOrganization({
        name: form.name,
        description: form.description,
        confession: isKonfessiyaRahbari ? user.confession : form.confession,
      });
      dispatch(addToast({ type: 'success', message: t('toasts.organization_created') }));
      setShowCreate(false);
      fetchOrganizations();
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || t('errors.organization_creation_failed');
      dispatch(addToast({ type: 'error', message: detail }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('dialogs.confirm_organization_delete'))) return;
    try {
      await confessionsAPI.deleteOrganization(id);
      dispatch(addToast({ type: 'success', message: t('toasts.organization_deleted') }));
      fetchOrganizations();
    } catch {
      dispatch(addToast({ type: 'error', message: t('errors.organization_deletion_failed') }));
    }
  };

  return (
    <div>
      {/* ===== Search & Filter ===== */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <select
            value={selectedConfession}
            onChange={(e) => setSelectedConfession(e.target.value)}
            className="input-field pl-9 pr-8 min-w-[200px]"
          >
            <option value="">{t('filters.all_confessions')}</option>
            {confessionNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== Bo'lim 1: Konfessiyalar ===== */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{t('sections.confessions_title')}</h1>
            <p className="text-sm text-text-secondary mt-1">
              {filteredConfessions.length !== confessions.length
                ? t('sections.confessions_filtered_count', { count: filteredConfessions.length, total: confessions.length })
                : t('sections.confessions_total_count', { count: confessions.length })}
            </p>
          </div>
          {isSuperAdmin && (
            <button onClick={handleOpenConfessionModal} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              {t('buttons.create_confession')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredConfessions.length === 0 ? (
          <div className="card p-8 text-center">
            <BookOpen size={36} className="mx-auto mb-3 text-text-secondary/30" />
            <p className="text-text-secondary">
              {searchQuery ? t('empty.confessions_search') : t('empty.confessions')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConfessions.map((conf) => (
              <div key={conf.id} className="card-hover p-5 border-l-4 border-l-primary-light">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="primary">{conf.name}</Badge>
                    </div>
                    {conf.description && (
                      <p className="text-sm text-text-secondary mt-2 line-clamp-2">{conf.description}</p>
                    )}
                    <div className="mt-3 flex flex-col gap-1 text-sm text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {conf.leader ? (
                          <>{t('cards.leader_assigned', { leader_name: conf.leader.full_name || conf.leader.email })}</>
                        ) : (
                          <span className="text-yellow-600">{t('cards.leader_unassigned')}</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 size={14} />
                        {t('cards.organization_count', { count: conf.organizations_count ?? 0 })}
                      </span>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleDeleteConfession(conf.id)}
                      className="flex items-center gap-1 text-sm text-danger hover:text-red-700 transition-colors ml-2 flex-shrink-0"
                      title={t('cards.delete_confession_title')}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Bo'lim 2: Diniy Tashkilotlar ===== */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">{t('sections.organizations_title')}</h2>
            <p className="text-sm text-text-secondary mt-1">
              {filteredOrganizations.length !== organizations.length
                ? t('sections.organizations_filtered_count', { count: filteredOrganizations.length, total: organizations.length })
                : t('sections.organizations_total_count', { count: organizations.length })}
            </p>
          </div>
          {canManage && (
            <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              {t('buttons.create_organization')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <div className="card p-12 text-center">
            <Building2 size={40} className="mx-auto mb-3 text-text-secondary/30" />
            <p className="text-text-secondary">
              {searchQuery || selectedConfession ? t('empty.organizations_search') : t('empty.organizations')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedOrgs).map(([confName, orgs]) => (
              <div key={confName}>
                <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <Badge variant="warning">{confName}</Badge>
                  <span className="text-sm text-text-secondary font-normal">{t('cards.subtext_organizations', { count: orgs.length })}</span>
                </h3>
                <div className="space-y-2">
                  {orgs.map((org) => (
                    <div key={org.id} className="card-hover p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-text-primary">{org.name}</h4>
                          {org.description && (
                            <p className="text-sm text-text-secondary mt-1 line-clamp-2">{org.description}</p>
                          )}
                          <div className="mt-2 flex items-center gap-4 text-sm text-text-secondary">
                            <span className="flex items-center gap-1">
                              <Users size={14} />
                              {org.leader ? (
                                <>{t('cards.leader_assigned', { leader_name: org.leader.full_name || org.leader.email })}</>
                              ) : (
                                <span className="text-yellow-600">{t('cards.leader_unassigned')}</span>
                              )}
                            </span>
                            {org.members_count !== undefined && (
                              <span>{t('cards.member_count', { count: org.members_count })}</span>
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
      </div>

      <Modal isOpen={showConfessionModal} onClose={() => setShowConfessionModal(false)} title={t('modals.confession_title')}>
        <form onSubmit={handleCreateConfessionModal} className="space-y-3">
          <FormField label={t('form.name_label')} error={confessionFormErrors.name} id="conf-name">
            <input
              id="conf-name"
              type="text"
              value={confessionForm.name}
              onChange={(e) => setConfessionForm({ ...confessionForm, name: e.target.value })}
              className="input-field"
              placeholder={t('form.confession_name_placeholder')}
            />
          </FormField>
          <FormField label={t('form.description_label')} id="conf-desc">
            <textarea
              id="conf-desc"
              value={confessionForm.description}
              onChange={(e) => setConfessionForm({ ...confessionForm, description: e.target.value })}
              className="input-field"
              rows={3}
              placeholder={t('form.confession_description_placeholder')}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowConfessionModal(false)} className="btn-secondary">{t('buttons.cancel')}</button>
            <button type="submit" disabled={creatingConfessionModal} className="btn-primary">
              {creatingConfessionModal ? t('buttons.create_loading') : t('buttons.create_submit')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t('modals.organization_title')}>
        <form onSubmit={handleCreate} className="space-y-3">
          {!isKonfessiyaRahbari && (
            <div>
              <FormField label={t('form.confession_label')} error={formErrors.confession} id="org-confession">
                <div className="flex items-center gap-2">
                  <select
                    id="org-confession"
                    value={form.confession}
                    onChange={(e) => setForm({ ...form, confession: e.target.value })}
                    className="input-field flex-1"
                  >
                    <option value="">{t('form.confession_select')}</option>
                    {confessions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewConfession(!showNewConfession)}
                    className="p-2 text-primary-light hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                    title={t('form.new_confession_section')}
                  >
                    {showNewConfession ? <X size={18} /> : <PlusCircle size={18} />}
                  </button>
                </div>
              </FormField>
              {showNewConfession && (
                <div className="mt-2 p-3 bg-surface rounded-xl space-y-2">
                  <p className="text-xs font-medium text-text-secondary">{t('form.new_confession_section')}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newConfessionName}
                      onChange={(e) => setNewConfessionName(e.target.value)}
                      className="input-field flex-1"
                      placeholder={t('form.confession_name_input')}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateConfessionInline(); } }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateConfessionInline}
                      disabled={creatingConfession || !newConfessionName.trim()}
                      className="btn-primary text-sm px-3 py-2 flex-shrink-0"
                    >
                      {creatingConfession ? '...' : t('buttons.create_submit')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <FormField label={t('form.name_label')} error={formErrors.name} id="org-name">
            <input id="org-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder={t('form.organization_name_placeholder')} />
          </FormField>
          <FormField label={t('form.description_label')} id="org-desc">
            <textarea id="org-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={3} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">{t('buttons.cancel')}</button>
            <button type="submit" className="btn-primary">{t('buttons.create_submit')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default OrganizationsPage;
