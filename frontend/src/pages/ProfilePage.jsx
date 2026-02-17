import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import authAPI from '../api/authAPI';
import cryptoAPI from '../api/cryptoAPI';
import FormField from '../components/ui/FormField';
import Skeleton from '../components/ui/Skeleton';
import { addToast } from '../store/uiSlice';
import { passwordStrength, required } from '../utils/validation';
import { loadPrivateKey, storePrivateKey, hasStoredPrivateKey } from '../utils/crypto';
import { User, Lock, Save } from 'lucide-react';
import { getInitials } from '../utils/helpers';

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
      dispatch(addToast({ type: 'error', message: "Profilni yuklashda xatolik" }));
      setLoading(false);
    });
  }, [dispatch]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const errs = {};
    if (required(firstName)) errs.first_name = required(firstName);
    if (required(lastName)) errs.last_name = required(lastName);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      const res = await authAPI.updateProfile({ first_name: firstName, last_name: lastName });
      setProfile(res.data);
      setErrors({});
      dispatch(addToast({ type: 'success', message: "Profil yangilandi" }));
    } catch {
      dispatch(addToast({ type: 'error', message: "Profilni yangilashda xatolik" }));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (required(oldPassword)) errs.old_password = required(oldPassword);
    const pwErr = passwordStrength(newPassword);
    if (pwErr) errs.new_password = pwErr;
    if (Object.keys(errs).length) { setPasswordErrors(errs); return; }
    try {
      await authAPI.changePassword({ old_password: oldPassword, new_password: newPassword });

      // Re-encrypt private key with new password
      const hasKey = await hasStoredPrivateKey();
      if (hasKey) {
        try {
          const privateKeyJwk = await loadPrivateKey(oldPassword);
          if (privateKeyJwk) {
            const newEncryptedData = await storePrivateKey(privateKeyJwk, newPassword);
            // Update server backup with new encrypted private key
            await cryptoAPI.savePublicKey({
              public_key: profile?.public_key || (await cryptoAPI.getMyKeys()).data.public_key,
              encrypted_private_key: JSON.stringify(newEncryptedData),
            });
          }
        } catch {
          dispatch(addToast({ type: 'warning', message: "Shifrlash kaliti yangilanmadi. Eski parolni eslab qoling." }));
        }
      }

      setOldPassword('');
      setNewPassword('');
      setPasswordErrors({});
      dispatch(addToast({ type: 'success', message: "Parol o'zgartirildi" }));
    } catch (err) {
      const detail = err.response?.data?.old_password?.[0] || "Parolni o'zgartirishda xatolik";
      dispatch(addToast({ type: 'error', message: detail }));
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton height="h-8" className="w-32" />
        <div className="card p-6"><Skeleton lines={4} /></div>
        <div className="card p-6"><Skeleton lines={3} /></div>
      </div>
    );
  }

  const initials = getInitials(profile?.first_name, profile?.last_name);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Profil</h1>
        <p className="text-sm text-text-secondary mt-1">Shaxsiy ma'lumotlarni boshqarish</p>
      </div>

      {/* Profile header card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-light/10 rounded-full flex items-center justify-center text-xl font-bold text-primary-light">
            {initials || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {profile?.first_name} {profile?.last_name}
            </h2>
            <p className="text-sm text-text-secondary">{profile?.email}</p>
            {profile?.role && (
              <span className="badge-info mt-1">{profile.role.name}</span>
            )}
          </div>
        </div>

        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <User size={16} className="text-primary-light" />
          Shaxsiy ma'lumotlar
        </h3>
        <form onSubmit={handleUpdateProfile} className="space-y-3">
          <FormField label="Ism" error={errors.first_name} id="first_name">
            <input id="first_name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input-field" />
          </FormField>
          <FormField label="Familiya" error={errors.last_name} id="last_name">
            <input id="last_name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input-field" />
          </FormField>
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Save size={16} />
            Saqlash
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Lock size={16} className="text-primary-light" />
          Parolni o'zgartirish
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <FormField label="Joriy parol" error={passwordErrors.old_password} id="old_password">
            <input id="old_password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="input-field" />
          </FormField>
          <FormField label="Yangi parol" error={passwordErrors.new_password} id="new_password">
            <input id="new_password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" />
          </FormField>
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Lock size={16} />
            Parolni o'zgartirish
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
