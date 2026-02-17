import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import LoginForm from '../components/auth/LoginForm';
import TwoFactorForm from '../components/auth/TwoFactorForm';
import { login, verify2FA } from '../store/authSlice';
import { Shield } from 'lucide-react';

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
    <div className="min-h-screen flex">
      {/* Left panel - brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary-light items-center justify-center p-12">
        <div className="text-center text-white max-w-md">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
            <Shield size={40} />
          </div>
          <h1 className="text-3xl font-bold mb-4">
            Xavfsiz Ma'lumotlar Platformasi
          </h1>
          <p className="text-lg text-white/80">
            O'zbekiston Respublikasi diniy konfessiyalari uchun xavfsiz ma'lumot almashish tizimi
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold">16</p>
              <p className="text-sm text-white/70">Konfessiyalar</p>
            </div>
            <div>
              <p className="text-2xl font-bold">E2E</p>
              <p className="text-sm text-white/70">Shifrlash</p>
            </div>
            <div>
              <p className="text-2xl font-bold">AI</p>
              <p className="text-sm text-white/70">Xavfsizlik</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-primary-light rounded-xl flex items-center justify-center mx-auto mb-3">
              <Shield size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-text-primary">XMP</h1>
          </div>

          <div className="card p-8">
            <h2 className="text-xl font-bold text-text-primary mb-1">
              {requires2FA ? 'Ikki bosqichli tasdiqlash' : 'Tizimga kirish'}
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              {requires2FA
                ? "Autentifikator ilovasidagi kodni kiriting"
                : "Hisobingizga kirish uchun ma'lumotlarni kiriting"
              }
            </p>

            {error && (
              <div className="bg-red-50 text-danger p-3 rounded-lg mb-4 text-sm border border-red-100">
                {error}
              </div>
            )}

            {requires2FA ? (
              <TwoFactorForm
                onSubmit={handleVerify2FA}
                loading={loading}
                onBack={() => setRequires2FA(false)}
              />
            ) : (
              <LoginForm onSubmit={handleLogin} loading={loading} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
