import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import authAPI from '../api/authAPI';
import FormField from '../components/ui/FormField';
import { passwordStrength } from '../utils/validation';

function PasswordResetConfirmPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    const pwErr = passwordStrength(password);
    if (pwErr) errs.password = pwErr;
    if (password !== confirmPassword) errs.confirm = 'Passwords do not match';
    if (!token) errs.token = 'Missing reset token';
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    try {
      await authAPI.confirmPasswordReset({ token, new_password: password });
      setSuccess(true);
      setServerError('');
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Failed to reset password');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Password Reset</h1>
          <p className="text-gray-600 mb-6">
            Your password has been reset successfully.
          </p>
          <Link
            to="/login"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 inline-block"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6">Set New Password</h1>
        {serverError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
            {serverError}
          </div>
        )}
        {errors.token && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
            {errors.token}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <FormField label="New Password" error={errors.password} id="new-password">
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </FormField>
          <FormField label="Confirm Password" error={errors.confirm} id="confirm-password">
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </FormField>
          <button
            type="submit"
            className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}

export default PasswordResetConfirmPage;
