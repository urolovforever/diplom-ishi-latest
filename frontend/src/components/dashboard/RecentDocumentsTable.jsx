import { FileText, Lock, Shield } from 'lucide-react';
import { formatDate } from '../../utils/helpers';

const levelConfig = {
  public: { label: 'Ommaviy', className: 'badge-info' },
  internal: { label: 'Ichki', className: 'badge-warning' },
  confidential: { label: 'Maxfiy', className: 'badge-danger' },
  secret: { label: 'Sir', className: 'badge-danger' },
};

function RecentDocumentsTable({ documents = [] }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">So'nggi hujjatlar</h3>
      {documents.length > 0 ? (
        <div className="space-y-3">
          {documents.slice(0, 5).map((doc) => {
            const level = levelConfig[doc.security_level] || levelConfig.internal;
            return (
              <div key={doc.id} className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText size={16} className="text-primary-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{doc.title}</p>
                  <p className="text-xs text-text-secondary">
                    {doc.uploaded_by?.full_name || doc.uploaded_by?.email || '-'} · {formatDate(doc.created_at)}
                  </p>
                </div>
                {doc.is_e2e_encrypted && (
                  <Lock size={14} className="text-success flex-shrink-0" />
                )}
                <span className={level.className}>{level.label}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center py-8 text-text-secondary text-sm">
          Hujjatlar mavjud emas
        </div>
      )}
    </div>
  );
}

export default RecentDocumentsTable;
