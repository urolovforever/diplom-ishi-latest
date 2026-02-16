import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import LoginForm from '../components/auth/LoginForm';
import TwoFactorForm from '../components/auth/TwoFactorForm';
import { login, verify2FA } from '../store/authSlice';

function LoginPage() {
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleLogin = async (credentials) => {
    const result = await dispatch(login(credentials));
    if (login.fulfilled.match(result)) {
      if (result.payload.requires_2fa) {
        setRequires2FA(true);
        setUserId(result.payload.user_id);
      } else {
        navigate('/');
      }
    }
  };

  const handleVerify2FA = async (token) => {
    const result = await dispatch(verify2FA({ user_id: userId, token }));
    if (verify2FA.fulfilled.match(result)) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
            Secure Confession Platform
          </h1>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          {requires2FA ? (
            <TwoFactorForm onSubmit={handleVerify2FA} loading={loading} />
          ) : (
            <LoginForm onSubmit={handleLogin} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
