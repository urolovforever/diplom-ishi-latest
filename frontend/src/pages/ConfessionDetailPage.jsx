import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchConfession, transitionConfession, clearCurrent } from '../store/confessionsSlice';
import { useAuth } from '../hooks/useAuth';
import { useCrypto } from '../hooks/useCrypto';
import { formatDateTime } from '../utils/helpers';
import KeySetup from '../components/auth/KeySetup';

function ConfessionDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: confession, loading, error } = useSelector((state) => state.confessions);
  const { user, isSuperAdmin, isQomitaRahbar, isConfessionLeader } = useAuth();
  const { isE2EReady, decryptConfession } = useCrypto();
  const { decryptConfession } = useCrypto();

  const [decryptedContent, setDecryptedContent] = useState(null);
  const [decryptError, setDecryptError] = useState(null);
  const [decrypting, setDecrypting] = useState(false);
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  useEffect(() => {
    dispatch(fetchConfession(id));
    return () => {
      dispatch(clearCurrent());
      setDecryptedContent(null);
    };
  }, [dispatch, id]);

  // Auto-decrypt if E2E is ready and confession is encrypted
  useEffect(() => {
    if (confession?.is_e2e_encrypted && isE2EReady && !decryptedContent && !decrypting) {
      handleDecrypt();
    }
  }, [confession, isE2EReady]);

  const handleDecrypt = async () => {
    if (!confession?.is_e2e_encrypted || !isE2EReady) return;
    setDecrypting(true);
    setDecryptError(null);

    try {
      const plaintext = await decryptConfession(
        confession.content,
        confession.encrypted_keys
      );
      setDecryptedContent(plaintext);
    } catch (err) {
      setDecryptError(err.message || 'Failed to decrypt confession');
      setDecryptError(null);
      setShowPasswordPrompt(false);
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (confession?.is_e2e_encrypted && !decryptedContent) {
      setShowPasswordPrompt(true);
    }
  }, [confession, decryptedContent]);

  const handleDecrypt = async () => {
    if (!password) return;
    setDecrypting(true);
    setDecryptError(null);
    try {
      const plaintext = await decryptConfession(
        confession.content,
        confession.encrypted_keys,
        user.id,
        password
      );
      setDecryptedContent(plaintext);
      setShowPasswordPrompt(false);
    } catch (err) {
      setDecryptError('Decryption failed. Check your password.');
    } finally {
      setDecrypting(false);
    }
  };

  const handleTransition = async (action) => {
    const result = await dispatch(transitionConfession({ id, action }));
    if (transitionConfession.rejected.match(result)) {
      alert(result.payload || 'Transition failed');
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!confession) return <p className="text-gray-500">Confession not found.</p>;

  if (showKeySetup) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Unlock E2E Encryption</h1>
        <KeySetup onComplete={() => setShowKeySetup(false)} />
        <button
          onClick={() => setShowKeySetup(false)}
          className="mt-4 text-gray-600 hover:text-gray-800 text-sm"
        >
          Back to confession
        </button>
      </div>
    );
  }

  const isAuthor = user?.id === confession.author?.id;
  const isLeaderPlus = isSuperAdmin || isQomitaRahbar || isConfessionLeader;
  const isEncrypted = confession.is_e2e_encrypted;
  const displayContent = isEncrypted ? (decryptedContent || null) : confession.content;
  const displayContent = confession.is_e2e_encrypted ? decryptedContent : confession.content;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{confession.title}</h1>
        <div className="flex gap-2">
          {isAuthor && confession.status === 'draft' && (
            <Link
              to={`/confessions/${id}/edit`}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Edit
            </Link>
          )}
          <Link to="/confessions" className="text-gray-600 hover:text-gray-800 px-4 py-2">
            Back
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex gap-4 mb-4 text-sm text-gray-500">
          <span>Status: <strong className="text-gray-700">{confession.status?.replace('_', ' ')}</strong></span>
          <span>Organization: <strong className="text-gray-700">{confession.organization_name}</strong></span>
          {confession.author && (
            <span>Author: <strong className="text-gray-700">{confession.author.full_name || confession.author.email}</strong></span>
          )}
          {confession.is_anonymous && <span className="text-yellow-600">(Anonymous)</span>}
          {confession.is_e2e_encrypted && (
            <span className="flex items-center gap-1 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              E2E Encrypted
            </span>
          )}
          <span>{formatDateTime(confession.created_at)}</span>
          {isEncrypted && (
            <span className="text-green-600 font-medium">E2E Encrypted</span>
          )}
        </div>

        {isEncrypted && !displayContent && (
          <div className="p-4 bg-gray-50 rounded text-center">
            {decrypting ? (
              <p className="text-gray-500">Decrypting...</p>
            ) : decryptError ? (
              <div>
                <p className="text-red-500 mb-2">{decryptError}</p>
                {!isE2EReady && (
                  <button
                    onClick={() => setShowKeySetup(true)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Unlock E2E keys
                  </button>
                )}
              </div>
            ) : (
              <div>
                <p className="text-gray-500 mb-2">This confession is end-to-end encrypted.</p>
                {isE2EReady ? (
                  <button
                    onClick={handleDecrypt}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                  >
                    Decrypt
                  </button>
                ) : (
                  <button
                    onClick={() => setShowKeySetup(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                  >
                    Unlock E2E Keys to Decrypt
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {displayContent && (
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{displayContent}</p>
          </div>
        )}
        {confession.is_e2e_encrypted && showPasswordPrompt && !decryptedContent && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
            <p className="text-sm text-yellow-800 mb-2">
              This confession is end-to-end encrypted. Enter your encryption password to decrypt.
            </p>
            {decryptError && (
              <p className="text-sm text-red-600 mb-2">{decryptError}</p>
            )}
            <div className="flex gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Encryption password"
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleDecrypt()}
              />
              <button
                onClick={handleDecrypt}
                disabled={decrypting}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {decrypting ? 'Decrypting...' : 'Decrypt'}
              </button>
            </div>
          </div>
        )}

        <div className="prose max-w-none">
          {displayContent ? (
            <p className="whitespace-pre-wrap">{displayContent}</p>
          ) : confession.is_e2e_encrypted ? (
            <p className="text-gray-400 italic">Encrypted content — enter password to view</p>
          ) : (
            <p className="whitespace-pre-wrap">{confession.content}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {isAuthor && confession.status === 'draft' && (
          <button
            onClick={() => handleTransition('submit')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Submit
          </button>
        )}
        {isLeaderPlus && confession.status === 'submitted' && (
          <button
            onClick={() => handleTransition('review')}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            Start Review
          </button>
        )}
        {isLeaderPlus && confession.status === 'under_review' && (
          <>
            <button
              onClick={() => handleTransition('approve')}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Approve
            </button>
            <button
              onClick={() => handleTransition('reject')}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ConfessionDetailPage;
