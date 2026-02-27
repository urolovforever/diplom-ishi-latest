import { useSelector } from 'react-redux';
import { ROLES } from '../utils/constants';

export function useAuth() {
  const { user, token } = useSelector((state) => state.auth);

  return {
    user,
    isAuthenticated: !!token,
    isSuperAdmin: user?.role?.name === ROLES.SUPER_ADMIN,
    isQomitaRahbar: user?.role?.name === ROLES.QOMITA_RAHBAR,
    isQomitaXodimi: user?.role?.name === ROLES.QOMITA_XODIMI,
    isKonfessiyaRahbari: user?.role?.name === ROLES.KONFESSIYA_RAHBARI,
    isKonfessiyaXodimi: user?.role?.name === ROLES.KONFESSIYA_XODIMI,
    isDTRahbar: user?.role?.name === ROLES.DT_RAHBAR,
    isDTXodimi: user?.role?.name === ROLES.DT_XODIMI,
    hasRole: (...roles) => roles.includes(user?.role?.name),
  };
}
