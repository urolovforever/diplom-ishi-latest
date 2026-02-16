function DocumentFilter({ filters, onChange }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 flex-wrap">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Security Level</label>
        <select
          value={filters.security_level || ''}
          onChange={(e) => onChange({ ...filters, security_level: e.target.value })}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm"
        >
          <option value="">All</option>
          <option value="public">Public</option>
          <option value="internal">Internal</option>
          <option value="confidential">Confidential</option>
          <option value="secret">Secret</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
        <select
          value={filters.category || ''}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm"
        >
          <option value="">All</option>
          <option value="confession_doc">Confession Doc</option>
          <option value="evidence">Evidence</option>
          <option value="report">Report</option>
          <option value="legal">Legal</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>
  );
}

export default DocumentFilter;
