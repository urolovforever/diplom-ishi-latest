import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import authAPI from '../api/authAPI';
import FormField from '../components/ui/FormField';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { addToast } from '../store/uiSlice';
import { passwordStrength, required } from '../utils/validation';

function ProfilePage() {
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errors, setErrors] = useState({});

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    authAPI.getProfile().then((res) => {
      setProfile(res.data);
      setFirstName(res.data.first_name);
      setLastName(res.data.last_name);
      setLoading(false);
    }).catch(() => {
      dispatch(addToast({ type: 'error', message: 'Failed to load profile' }));
      setLoading(false);
    });
  }, [dispatch]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const errs = {};
    if (required(firstName)) errs.first_name = required(firstName);
    if (required(lastName)) errs.last_name = required(lastName);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    try {
      const res = await authAPI.updateProfile({ first_name: firstName, last_name: lastName });
      setProfile(res.data);
      setErrors({});
      dispatch(addToast({ type: 'success', message: 'Profile updated' }));
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to update profile' }));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (required(oldPassword)) errs.old_password = required(oldPassword);
    const pwErr = passwordStrength(newPassword);
    if (pwErr) errs.new_password = pwErr;
    if (Object.keys(errs).length) {
      setPasswordErrors(errs);
      return;
    }
    try {
      await authAPI.changePassword({ old_password: oldPassword, new_password: newPassword });
      setOldPassword('');
      setNewPassword('');
      setPasswordErrors({});
      dispatch(addToast({ type: 'success', message: 'Password changed' }));
    } catch (err) {
      const detail = err.response?.data?.old_password?.[0] || 'Failed to change password';
      dispatch(addToast({ type: 'error', message: detail }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
        <p className="text-sm text-gray-500 mb-4">{profile?.email}</p>
        <form onSubmit={handleUpdateProfile}>
          <FormField label="First Name" error={errors.first_name} id="first_name">
            <input
              id="first_name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </FormField>
          <FormField label="Last Name" error={errors.last_name} id="last_name">
            <input
              id="last_name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </FormField>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Update Profile
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword}>
          <FormField label="Current Password" error={passwordErrors.old_password} id="old_password">
            <input
              id="old_password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </FormField>
          <FormField label="New Password" error={passwordErrors.new_password} id="new_password">
            <input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </FormField>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
