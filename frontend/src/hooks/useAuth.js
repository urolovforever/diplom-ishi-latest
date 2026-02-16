import { useSelector } from 'react-redux';
import { ROLES } from '../utils/constants';

export function useAuth() {
  const { user, token } = useSelector((state) => state.auth);

  return {
    user,
    isAuthenticated: !!token,
    isSuperAdmin: user?.role?.name === ROLES.SUPER_ADMIN,
    isQomitaRahbar: user?.role?.name === ROLES.QOMITA_RAHBAR,
    isConfessionLeader: user?.role?.name === ROLES.CONFESSION_LEADER,
    isMember: user?.role?.name === ROLES.MEMBER,
  };
}
