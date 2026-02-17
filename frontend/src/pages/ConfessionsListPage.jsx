import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchConfessions } from '../store/confessionsSlice';
import { CONFESSION_STATUS } from '../utils/constants';
import { formatDate } from '../utils/helpers';
import { Plus, Users, FileText, Building2, ChevronRight } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'badge-neutral',
  submitted: 'badge-info',
  under_review: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
};

const STATUS_LABELS = {
  draft: 'Qoralama',
  submitted: 'Yuborilgan',
  under_review: "Ko'rib chiqilmoqda",
  approved: 'Tasdiqlangan',
  rejected: 'Rad etilgan',
};

const STRIP_COLORS = {
  draft: 'bg-gray-400',
  submitted: 'bg-primary-light',
  under_review: 'bg-warning',
  approved: 'bg-success',
  rejected: 'bg-danger',
};

function ConfessionsListPage() {
  const dispatch = useDispatch();
  const { list, count, loading } = useSelector((state) => state.confessions);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    dispatch(fetchConfessions(params));
  }, [dispatch, statusFilter]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Konfessiyalar</h1>
          <p className="text-sm text-text-secondary mt-1">
            {count > 0 ? `Jami ${count} ta konfessiya` : 'Barcha konfessiyalar'}
          </p>
        </div>
        <Link to="/confessions/new" className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Yangi konfessiya
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field max-w-xs"
        >
          <option value="">Barcha holatlar</option>
          {Object.entries(CONFESSION_STATUS).map(([key, value]) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value] || key.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-3 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((confession) => (
            <div key={confession.id} className="card-hover overflow-hidden flex">
              {/* Colored left strip */}
              <div className={`w-1.5 flex-shrink-0 ${STRIP_COLORS[confession.status] || 'bg-gray-300'}`} />
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-text-primary line-clamp-1">
                    {confession.title}
                  </h3>
                  <span className={STATUS_COLORS[confession.status] || 'badge-neutral'}>
                    {STATUS_LABELS[confession.status] || confession.status}
                  </span>
                </div>

                {confession.is_anonymous && (
                  <span className="text-xs text-text-secondary bg-gray-100 px-2 py-0.5 rounded-full">
                    Anonim
                  </span>
                )}

                <div className="flex items-center gap-4 mt-4 text-xs text-text-secondary">
                  {confession.organization_name && (
                    <div className="flex items-center gap-1">
                      <Building2 size={13} />
                      <span className="truncate max-w-[120px]">{confession.organization_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <FileText size={13} />
                    <span>{formatDate(confession.created_at)}</span>
                  </div>
                </div>

                <Link
                  to={`/confessions/${confession.id}`}
                  className="flex items-center gap-1 mt-4 text-sm text-primary-light hover:text-primary font-medium transition-colors"
                >
                  Batafsil
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="col-span-full card p-12 text-center text-text-secondary">
              Konfessiyalar topilmadi
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ConfessionsListPage;
