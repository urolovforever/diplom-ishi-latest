import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setSidebarOpen } from '../../store/uiSlice';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Building2,
  Bell,
  BrainCircuit,
  BarChart3,
  ScrollText,
  Users,
  Settings,
  User,
  Shield,
  X,
} from 'lucide-react';
import { getInitials } from '../../utils/helpers';

const navItems = [
  { path: '/', label: 'Bosh sahifa', icon: LayoutDashboard, roles: null },
  { path: '/confessions', label: 'Konfessiyalar', icon: BookOpen, roles: null },
  { path: '/documents', label: 'Hujjatlar', icon: FileText, roles: null },
  { path: '/organizations', label: 'Tashkilotlar', icon: Building2, roles: ['super_admin', 'qomita_rahbar'] },
  { path: '/notifications', label: 'Bildirishnomalar', icon: Bell, roles: null },
  { path: '/ai-dashboard', label: 'AI Xavfsizlik', icon: BrainCircuit, roles: ['super_admin', 'security_auditor', 'it_admin'] },
  { path: '/reports', label: 'Hisobotlar', icon: BarChart3, roles: ['super_admin', 'security_auditor', 'qomita_rahbar'] },
  { path: '/audit-log', label: 'Audit jurnali', icon: ScrollText, roles: ['super_admin', 'security_auditor'] },
  { path: '/users', label: 'Foydalanuvchilar', icon: Users, roles: ['super_admin'] },
  { path: '/settings', label: 'Sozlamalar', icon: Settings, roles: ['super_admin', 'it_admin'] },
  { path: '/profile', label: 'Profil', icon: User, roles: null },
];

function Sidebar() {
  const user = useSelector((state) => state.auth.user);
  const { sidebarOpen, sidebarCollapsed } = useSelector((state) => state.ui);
  const dispatch = useDispatch();
  const userRole = user?.role?.name;

  const filteredItems = navItems.filter(
    (item) => item.roles === null || item.roles.includes(userRole),
  );

  const initials = getInitials(user?.first_name, user?.last_name);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-sidebar text-white flex flex-col
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
          w-64 min-h-screen
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield size={20} />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate">XMP</h2>
              <p className="text-[10px] text-gray-400 truncate">Xavfsiz Ma'lumotlar</p>
            </div>
          )}
          <button
            onClick={() => dispatch(setSidebarOpen(false))}
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <ul className="space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => dispatch(setSidebarOpen(false))}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-primary-light/20 text-white border-l-3 border-primary-light font-medium'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={19} className="flex-shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User profile at bottom */}
        {!sidebarCollapsed && user && (
          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-light/30 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                {initials || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-gray-400 truncate">{userRole?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;
