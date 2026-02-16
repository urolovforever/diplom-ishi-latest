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

function UserManagementPage() {
  const dispatch = useDispatch();
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
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
      dispatch(addToast({ type: 'error', message: 'Failed to load users' }));
    }
    setLoading(false);
  }, [page, dispatch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Extract unique roles from users for the invite dropdown
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
    if (required(inviteForm.first_name)) errs.first_name = 'Required';
    if (required(inviteForm.last_name)) errs.last_name = 'Required';
    const pwErr = passwordStrength(inviteForm.password);
    if (pwErr) errs.password = pwErr;
    if (!inviteForm.role_id) errs.role_id = 'Select a role';
    if (Object.keys(errs).length) {
      setInviteErrors(errs);
      return;
    }
    try {
      await authAPI.inviteUser(inviteForm);
      dispatch(addToast({ type: 'success', message: 'User invited successfully' }));
      setShowInvite(false);
      setInviteForm({ email: '', first_name: '', last_name: '', password: '', role_id: '' });
      setInviteErrors({});
      fetchUsers();
    } catch (err) {
      const detail = err.response?.data?.email?.[0] || 'Failed to invite user';
      dispatch(addToast({ type: 'error', message: detail }));
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await authAPI.updateUser(user.id, { is_active: !user.is_active });
      dispatch(addToast({
        type: 'success',
        message: `User ${user.is_active ? 'deactivated' : 'activated'}`,
      }));
      fetchUsers();
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to update user' }));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Invite User
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{user.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="info">{user.role?.name || 'No role'}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={user.is_active ? 'success' : 'danger'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`text-sm ${user.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination count={count} currentPage={page} onPageChange={setPage} />
        </>
      )}

      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite User">
        <form onSubmit={handleInvite}>
          <FormField label="Email" error={inviteErrors.email} id="invite-email">
            <input
              id="invite-email"
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </FormField>
          <FormField label="First Name" error={inviteErrors.first_name} id="invite-first">
            <input
              id="invite-first"
              type="text"
              value={inviteForm.first_name}
              onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </FormField>
          <FormField label="Last Name" error={inviteErrors.last_name} id="invite-last">
            <input
              id="invite-last"
              type="text"
              value={inviteForm.last_name}
              onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </FormField>
          <FormField label="Password" error={inviteErrors.password} id="invite-password">
            <input
              id="invite-password"
              type="password"
              value={inviteForm.password}
              onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </FormField>
          <FormField label="Role" error={inviteErrors.role_id} id="invite-role">
            <select
              id="invite-role"
              value={inviteForm.role_id}
              onChange={(e) => setInviteForm({ ...inviteForm, role_id: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select role...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </FormField>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Invite
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default UserManagementPage;
