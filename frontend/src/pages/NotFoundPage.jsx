import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, AlertTriangle } from 'lucide-react';

function NotFoundPage() {
  const { t } = useTranslation('errors');
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center">
        <AlertTriangle size={48} className="mx-auto mb-4 text-warning" />
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="text-xl text-text-secondary mt-4">{t('not_found.title')}</p>
        <p className="text-sm text-text-secondary/70 mt-2">
          {t('not_found.description')}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 btn-primary"
        >
          <Home size={18} />
          {t('not_found.home_link')}
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
