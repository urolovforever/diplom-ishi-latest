import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard' },
];

function Sidebar() {
  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen p-4">
      <div className="mb-8">
        <h2 className="text-lg font-bold">SCP</h2>
        <p className="text-xs text-gray-400">Secure Confession Platform</p>
      </div>
      <nav>
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end
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
