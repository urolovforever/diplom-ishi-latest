import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels = {
  '': 'Bosh sahifa',
  'confessions': 'Konfessiyalar',
  'new': 'Yangi',
  'edit': 'Tahrirlash',
  'documents': 'Hujjatlar',
  'organizations': 'Tashkilotlar',
  'notifications': 'Bildirishnomalar',
  'ai-dashboard': 'AI Xavfsizlik',
  'reports': 'Hisobotlar',
  'audit-log': 'Audit jurnali',
  'users': 'Foydalanuvchilar',
  'settings': 'Sozlamalar',
  'profile': 'Profil',
  'password-reset': 'Parolni tiklash',
};

function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return (
      <div className="flex items-center text-sm text-text-secondary">
        <Home size={15} className="mr-1.5" />
        <span className="font-medium text-text-primary">Bosh sahifa</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center text-sm text-text-secondary">
      <Link to="/" className="hover:text-primary-light transition-colors">
        <Home size={15} />
      </Link>
      {segments.map((segment, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;
        const label = routeLabels[segment] || segment;

        return (
          <span key={path} className="flex items-center">
            <ChevronRight size={14} className="mx-1.5 text-gray-300" />
            {isLast ? (
              <span className="font-medium text-text-primary">{label}</span>
            ) : (
              <Link to={path} className="hover:text-primary-light transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumb;
