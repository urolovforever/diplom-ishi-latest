import Badge from '../ui/Badge';
import { formatDate } from '../../utils/helpers';

function DocumentCard({ document, onView, onDownload }) {
  const securityColors = {
    public: 'info',
    internal: 'default',
    confidential: 'warning',
    secret: 'danger',
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-gray-800">{document.title}</h3>
        <Badge type={securityColors[document.security_level] || 'default'}>
          {document.security_level}
        </Badge>
      </div>
      {document.description && (
        <p className="text-sm text-gray-500 mb-2">{document.description}</p>
      )}
      <div className="text-xs text-gray-400 mb-3">
        <span>{document.uploaded_by?.email}</span>
        <span className="mx-2">|</span>
        <span>{formatDate(document.created_at)}</span>
      </div>
      <div className="flex gap-2">
        {onView && (
          <button onClick={() => onView(document.id)} className="text-xs text-blue-600 hover:underline">
            View
          </button>
        )}
        {onDownload && (
          <button onClick={() => onDownload(document.id)} className="text-xs text-green-600 hover:underline">
            Download
          </button>
        )}
      </div>
    </div>
  );
}

export default DocumentCard;
