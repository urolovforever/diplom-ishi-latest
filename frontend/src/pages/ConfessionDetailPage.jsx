import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchConfession, transitionConfession, clearCurrent } from '../store/confessionsSlice';
import { useAuth } from '../hooks/useAuth';
import { formatDateTime } from '../utils/helpers';

function ConfessionDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: confession, loading, error } = useSelector((state) => state.confessions);
  const { user, isSuperAdmin, isQomitaRahbar, isConfessionLeader } = useAuth();

  useEffect(() => {
    dispatch(fetchConfession(id));
    return () => dispatch(clearCurrent());
  }, [dispatch, id]);

  const handleTransition = async (action) => {
    const result = await dispatch(transitionConfession({ id, action }));
    if (transitionConfession.rejected.match(result)) {
      alert(result.payload || 'Transition failed');
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!confession) return <p className="text-gray-500">Confession not found.</p>;

  const isAuthor = user?.id === confession.author?.id;
  const isLeaderPlus = isSuperAdmin || isQomitaRahbar || isConfessionLeader;

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
          <span>{formatDateTime(confession.created_at)}</span>
        </div>

        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap">{confession.content}</p>
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
