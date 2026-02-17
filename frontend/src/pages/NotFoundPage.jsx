import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center">
        <AlertTriangle size={48} className="mx-auto mb-4 text-warning" />
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="text-xl text-text-secondary mt-4">Sahifa topilmadi</p>
        <p className="text-sm text-text-secondary/70 mt-2">
          Siz qidirayotgan sahifa mavjud emas yoki ko'chirilgan
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 btn-primary"
        >
          <Home size={18} />
          Bosh sahifaga qaytish
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
