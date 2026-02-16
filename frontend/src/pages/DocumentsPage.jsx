import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDocuments, uploadDocument, deleteDocument, fetchVersions } from '../store/documentsSlice';
import { formatDate } from '../utils/helpers';

function DocumentsPage() {
  const dispatch = useDispatch();
  const { list, count, versions, loading } = useSelector((state) => state.documents);
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState(null);

  useEffect(() => {
    dispatch(fetchDocuments());
  }, [dispatch]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('file', file);
    await dispatch(uploadDocument(formData));
    setTitle('');
    setDescription('');
    setFile(null);
    setShowUpload(false);
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this document?')) {
      dispatch(deleteDocument(id));
    }
  };

  const toggleVersions = (docId) => {
    if (expandedDoc === docId) {
      setExpandedDoc(null);
    } else {
      setExpandedDoc(docId);
      if (!versions[docId]) {
        dispatch(fetchVersions(docId));
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Documents</h1>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showUpload ? 'Cancel' : 'Upload Document'}
        </button>
      </div>

      {showUpload && (
        <form onSubmit={handleUpload} className="bg-white rounded-lg shadow p-6 mb-6 max-w-lg">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full"
              required
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Uploaded By</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {list.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-gray-800">{doc.title}</span>
                    {doc.description && (
                      <p className="text-xs text-gray-500 mt-1">{doc.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {doc.uploaded_by?.full_name || doc.uploaded_by?.email || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => toggleVersions(doc.id)}
                      className="text-blue-600 hover:underline mr-3"
                    >
                      Versions
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {expandedDoc && versions[expandedDoc] && (
                <tr>
                  <td colSpan="4" className="px-4 py-3 bg-gray-50">
                    <p className="text-sm font-medium text-gray-600 mb-2">Version History</p>
                    {versions[expandedDoc].length > 0 ? (
                      <ul className="text-sm text-gray-500 space-y-1">
                        {versions[expandedDoc].map((v) => (
                          <li key={v.id}>
                            v{v.version_number} - {v.change_summary || 'No summary'} ({formatDate(v.created_at)})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400">No versions found.</p>
                    )}
                  </td>
                </tr>
              )}
              {list.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                    No documents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {count > 0 && (
            <div className="px-4 py-3 bg-gray-50 text-sm text-gray-500">
              {count} document{count !== 1 ? 's' : ''} total
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DocumentsPage;
