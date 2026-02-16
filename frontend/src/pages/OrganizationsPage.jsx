import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import confessionsAPI from '../api/confessionsAPI';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import FormField from '../components/ui/FormField';
import { addToast } from '../store/uiSlice';

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
      dispatch(addToast({ type: 'error', message: 'Failed to load organizations' }));
    }
    setLoading(false);
  }, [dispatch]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }
    try {
      await confessionsAPI.createOrganization(form);
      dispatch(addToast({ type: 'success', message: 'Organization created' }));
      setShowCreate(false);
      setForm({ name: '', description: '' });
      setFormErrors({});
      fetchOrganizations();
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to create organization' }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this organization?')) return;
    try {
      await confessionsAPI.deleteOrganization(id);
      dispatch(addToast({ type: 'success', message: 'Organization deleted' }));
      fetchOrganizations();
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to delete organization' }));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Organizations</h1>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Organization
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No organizations found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <div key={org.id} className="bg-white rounded-lg shadow p-5">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">{org.name}</h3>
                <Badge variant="info">{org.confession_count || 0} confessions</Badge>
              </div>
              {org.description && (
                <p className="text-sm text-gray-500 mt-2">{org.description}</p>
              )}
              <div className="mt-3 text-sm text-gray-400">
                {org.leader ? (
                  <span>Leader: {org.leader.full_name || org.leader.email}</span>
                ) : (
                  <span>No leader assigned</span>
                )}
              </div>
              {isAdmin && (
                <div className="mt-4 pt-3 border-t flex space-x-2">
                  <button
                    onClick={() => handleDelete(org.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Organization">
        <form onSubmit={handleCreate}>
          <FormField label="Name" error={formErrors.name} id="org-name">
            <input
              id="org-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </FormField>
          <FormField label="Description" error={formErrors.description} id="org-desc">
            <textarea
              id="org-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </FormField>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default OrganizationsPage;
