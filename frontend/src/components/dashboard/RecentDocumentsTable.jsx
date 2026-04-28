import { useTranslation } from 'react-i18next';
import { FileText, Lock, Shield } from 'lucide-react';
import { formatDate } from '../../utils/helpers';

const levelClassNames = {
  public: 'badge-info',
  internal: 'badge-warning',
  confidential: 'badge-danger',
  secret: 'badge-danger',
};

function RecentDocumentsTable({ documents = [] }) {
  const { t } = useTranslation('dashboard');
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{t('documents_table.title')}</h3>
      {documents.length > 0 ? (
        <div className="space-y-3">
          {documents.slice(0, 5).map((doc) => {
            const levelKey = doc.security_level && levelClassNames[doc.security_level] ? doc.security_level : 'internal';
            const className = levelClassNames[levelKey];
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
                <span className={className}>{t(`documents_table.levels.${levelKey}`)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center py-8 text-text-secondary text-sm">
          {t('documents_table.empty')}
        </div>
      )}
    </div>
  );
}

export default RecentDocumentsTable;
