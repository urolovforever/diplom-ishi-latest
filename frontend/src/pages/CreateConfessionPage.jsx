import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  createConfession,
  updateConfession,
  fetchConfession,
  fetchOrganizations,
  clearCurrent,
} from '../store/confessionsSlice';

function CreateConfessionPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, organizations } = useSelector((state) => state.confessions);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [organization, setOrganization] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    dispatch(fetchOrganizations());
    if (isEdit) {
      dispatch(fetchConfession(id));
    }
    return () => dispatch(clearCurrent());
  }, [dispatch, id, isEdit]);

  useEffect(() => {
    if (isEdit && current) {
      setTitle(current.title);
      setContent(current.content);
      setOrganization(current.organization);
      setIsAnonymous(current.is_anonymous);
    }
  }, [current, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = { title, content, organization, is_anonymous: isAnonymous };

    try {
      let result;
      if (isEdit) {
        result = await dispatch(updateConfession({ id, data }));
        if (updateConfession.rejected.match(result)) throw new Error('Update failed');
      } else {
        result = await dispatch(createConfession(data));
        if (createConfession.rejected.match(result)) throw new Error('Create failed');
      }
      navigate('/confessions');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? 'Edit Confession' : 'New Confession'}
      </h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-2xl">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
          <select
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select organization...</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Submit anonymously</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/confessions')}
            className="text-gray-600 hover:text-gray-800 px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateConfessionPage;
