import { useState } from 'react';
import Button from '../common/Button';

const ALLOWED_TYPES = '.pdf,.docx,.xlsx,.jpg,.jpeg,.png';

function DocumentUpload({ onUpload, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [securityLevel, setSecurityLevel] = useState('internal');
  const [category, setCategory] = useState('other');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('file', file);
    formData.append('security_level', securityLevel);
    formData.append('category', category);
    await onUpload(formData);
    setUploading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6 max-w-lg">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Security Level</label>
          <select value={securityLevel} onChange={(e) => setSecurityLevel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded">
            <option value="public">Public</option>
            <option value="internal">Internal</option>
            <option value="confidential">Confidential</option>
            <option value="secret">Secret</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded">
            <option value="confession_doc">Confession Document</option>
            <option value="evidence">Evidence</option>
            <option value="report">Report</option>
            <option value="legal">Legal</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          File (PDF, DOCX, XLSX, JPG, PNG - max 50MB)
        </label>
        <input type="file" accept={ALLOWED_TYPES} onChange={(e) => setFile(e.target.files[0])} className="w-full" required />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</Button>
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default DocumentUpload;
