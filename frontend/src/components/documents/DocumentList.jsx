import { formatDate } from '../../utils/helpers';
import Badge from '../ui/Badge';

function DocumentList({ documents, onDelete, onToggleVersions, onDownload }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Security</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Uploaded By</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <span className="font-medium text-gray-800">{doc.title}</span>
                {doc.description && <p className="text-xs text-gray-500 mt-1">{doc.description}</p>}
              </td>
              <td className="px-4 py-3">
                <Badge type={doc.security_level === 'secret' ? 'danger' : doc.security_level === 'confidential' ? 'warning' : 'info'}>
                  {doc.security_level}
                </Badge>
              </td>
              <td className="px-4 py-3 text-gray-600">{doc.category}</td>
              <td className="px-4 py-3 text-gray-600">
                {doc.uploaded_by?.full_name || doc.uploaded_by?.email || '-'}
              </td>
              <td className="px-4 py-3 text-gray-500">{formatDate(doc.created_at)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {onDownload && (
                    <button onClick={() => onDownload(doc.id)} className="text-green-600 hover:underline text-xs">
                      Download
                    </button>
                  )}
                  <button onClick={() => onToggleVersions?.(doc.id)} className="text-blue-600 hover:underline text-xs">
                    Versions
                  </button>
                  <button onClick={() => onDelete?.(doc.id)} className="text-red-600 hover:underline text-xs">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {documents.length === 0 && (
            <tr>
              <td colSpan="6" className="px-4 py-8 text-center text-gray-500">No documents found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DocumentList;
