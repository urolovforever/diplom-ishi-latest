import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';

const navItems = [
  { path: '/', label: 'Dashboard', roles: null },
  { path: '/confessions', label: 'Confessions', roles: null },
  { path: '/documents', label: 'Documents', roles: null },
  { path: '/notifications', label: 'Notifications', roles: null },
  { path: '/users', label: 'User Management', roles: ['super_admin'] },
  { path: '/profile', label: 'Profile', roles: null },
];

function Sidebar() {
  const user = useSelector((state) => state.auth.user);
  const userRole = user?.role?.name;

  const filteredItems = navItems.filter(
    (item) => item.roles === null || item.roles.includes(userRole),
  );

  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen p-4">
      <div className="mb-8">
        <h2 className="text-lg font-bold">SCP</h2>
        <p className="text-xs text-gray-400">Secure Confession Platform</p>
      </div>
      <nav>
        <ul className="space-y-2">
          {filteredItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `block px-4 py-2 rounded ${
                    isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
