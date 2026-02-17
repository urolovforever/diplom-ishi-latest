import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/authSlice';
import { toggleSidebar, toggleSidebarCollapsed } from '../../store/uiSlice';
import { Menu, Bell, User, Settings, LogOut, PanelLeftClose, PanelLeft } from 'lucide-react';
import Breadcrumb from '../ui/Breadcrumb';
import { getInitials } from '../../utils/helpers';

function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { sidebarCollapsed } = useSelector((state) => state.ui);
  const { unreadCount } = useSelector((state) => state.notifications);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const initials = getInitials(user?.first_name, user?.last_name);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="lg:hidden p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-gray-100"
        >
          <Menu size={22} />
        </button>
        {/* Desktop collapse toggle */}
        <button
          onClick={() => dispatch(toggleSidebarCollapsed())}
          className="hidden lg:flex p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-gray-100"
        >
          {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-light/10 text-primary-light rounded-full flex items-center justify-center text-sm font-medium">
              {initials || 'U'}
            </div>
            <span className="hidden md:block text-sm text-text-primary font-medium">
              {user?.first_name || user?.email}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-card shadow-lg border border-gray-100 py-1 animate-scale-in">
              <button
                onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50 transition-colors"
              >
                <User size={16} className="text-text-secondary" />
                Profil
              </button>
              <button
                onClick={() => { navigate('/settings'); setDropdownOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50 transition-colors"
              >
                <Settings size={16} className="text-text-secondary" />
                Sozlamalar
              </button>
              <hr className="my-1 border-gray-100" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                Chiqish
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
