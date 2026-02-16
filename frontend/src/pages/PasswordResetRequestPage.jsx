import { useState } from 'react';
import { Link } from 'react-router-dom';
import authAPI from '../api/authAPI';
import FormField from '../components/ui/FormField';
import { required, email as emailValidator } from '../utils/validation';

function PasswordResetRequestPage() {
  const [emailValue, setEmailValue] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = required(emailValue) || emailValidator(emailValue);
    if (err) {
      setError(err);
      return;
    }
    try {
      await authAPI.requestPasswordReset(emailValue);
    } catch {
      // Always show success to prevent email enumeration
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Check your email</h1>
          <p className="text-gray-600 mb-6">
            If an account with that email exists, we sent a password reset link.
          </p>
          <Link to="/login" className="text-blue-500 hover:text-blue-600">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6">Reset Password</h1>
        <form onSubmit={handleSubmit}>
          <FormField label="Email" error={error} id="reset-email">
            <input
              id="reset-email"
              type="email"
              value={emailValue}
              onChange={(e) => { setEmailValue(e.target.value); setError(''); }}
              className="w-full border rounded px-3 py-2"
              placeholder="Enter your email"
            />
          </FormField>
          <button
            type="submit"
            className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Send Reset Link
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link to="/login" className="text-blue-500 hover:text-blue-600">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default PasswordResetRequestPage;
