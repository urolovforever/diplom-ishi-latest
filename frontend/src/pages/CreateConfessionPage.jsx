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
import { useCrypto } from '../hooks/useCrypto';
import KeySetup from '../components/auth/KeySetup';
import confessionsAPI from '../api/confessionsAPI';

function CreateConfessionPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, organizations } = useSelector((state) => state.confessions);
  const { isE2EReady, hasPublicKey, encryptConfession } = useCrypto();
  const { user } = useSelector((state) => state.auth);
  const { encryptConfession, getRecipientPublicKeys } = useCrypto();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [organization, setOrganization] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [useE2E, setUseE2E] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showKeySetup, setShowKeySetup] = useState(false);

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

    try {
      let data;

      if (useE2E && isE2EReady && !isEdit) {
        // E2E encrypt the confession
        const { encryptedContent, encryptedKeys } = await encryptConfession(content, organization);
        data = {
          title,
          content: encryptedContent,
          organization,
          is_anonymous: isAnonymous,
          is_e2e_encrypted: true,
          encrypted_keys: encryptedKeys,
        };
      } else {
        // Plain text (backwards compatible)
        data = { title, content, organization, is_anonymous: isAnonymous };
      }

      let result;
      if (isEdit) {
        const data = { title, content, organization, is_anonymous: isAnonymous };
        const result = await dispatch(updateConfession({ id, data }));
        if (updateConfession.rejected.match(result)) throw new Error('Update failed');
      } else {
        // Collect recipient user IDs (org leader + current user)
        const selectedOrg = organizations.find((o) => o.id === organization);
        const recipientUserIds = new Set();
        recipientUserIds.add(user.id);
        if (selectedOrg?.leader?.id) {
          recipientUserIds.add(selectedOrg.leader.id);
        }

        const recipientPublicKeys = await getRecipientPublicKeys([...recipientUserIds]);

        if (recipientPublicKeys.length > 0) {
          const { encryptedContent, encryptedKeys } = await encryptConfession(
            content,
            recipientPublicKeys
          );
          const data = {
            title,
            content: encryptedContent,
            organization,
            is_anonymous: isAnonymous,
            is_e2e_encrypted: true,
            encrypted_keys: encryptedKeys,
          };
          const result = await dispatch(createConfession(data));
          if (createConfession.rejected.match(result)) throw new Error('Create failed');
        } else {
          // Fallback: no keys available, send unencrypted
          const data = { title, content, organization, is_anonymous: isAnonymous };
          const result = await dispatch(createConfession(data));
          if (createConfession.rejected.match(result)) throw new Error('Create failed');
        }
      }
      navigate('/confessions');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (showKeySetup) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Set Up E2E Encryption</h1>
        <KeySetup onComplete={() => setShowKeySetup(false)} />
        <button
          onClick={() => setShowKeySetup(false)}
          className="mt-4 text-gray-600 hover:text-gray-800 text-sm"
        >
          Skip for now
        </button>
      </div>
    );
  }

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

        <div className="mb-4">
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

        {!isEdit && (
          <div className="mb-6 p-3 bg-gray-50 rounded">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useE2E}
                onChange={(e) => setUseE2E(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                End-to-End Encryption
              </span>
            </label>
            {useE2E && !isE2EReady && (
              <div className="mt-2 text-sm text-yellow-600">
                E2E encryption is not set up yet.{' '}
                <button
                  type="button"
                  onClick={() => setShowKeySetup(true)}
                  className="text-blue-600 hover:underline"
                >
                  Set up now
                </button>
              </div>
            )}
            {useE2E && isE2EReady && (
              <p className="mt-1 text-xs text-green-600">
                Content will be encrypted in your browser before sending.
              </p>
            )}
          <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            End-to-end encrypted
          </div>
        )}

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
