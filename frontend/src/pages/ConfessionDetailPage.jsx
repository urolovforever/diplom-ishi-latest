import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchConfession, transitionConfession, clearCurrent } from '../store/confessionsSlice';
import { useAuth } from '../hooks/useAuth';
import { useCrypto } from '../hooks/useCrypto';
import { formatDateTime } from '../utils/helpers';
import KeySetup from '../components/auth/KeySetup';
import { ArrowLeft, Edit3, Lock, Send, CheckCircle, XCircle, Eye } from 'lucide-react';

const STATUS_LABELS = {
  draft: 'Qoralama',
  submitted: 'Yuborilgan',
  under_review: "Ko'rib chiqilmoqda",
  approved: 'Tasdiqlangan',
  rejected: 'Rad etilgan',
};

function ConfessionDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: confession, loading, error } = useSelector((state) => state.confessions);
  const { user, isSuperAdmin, isQomitaRahbar, isConfessionLeader } = useAuth();
  const { isE2EReady, decryptConfession } = useCrypto();

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
      setDecryptError("Shifrni ochishda xatolik. Parolingizni tekshiring.");
    } finally {
      setDecrypting(false);
    }
  };

  const handleTransition = async (action) => {
    const result = await dispatch(transitionConfession({ id, action }));
    if (transitionConfession.rejected.match(result)) {
      alert(result.payload || "O'tkazish amalga oshmadi");
    }
  };

  if (loading) return <div className="flex justify-center py-12 text-text-secondary">Yuklanmoqda...</div>;
  if (error) return <div className="bg-red-50 text-danger p-4 rounded-xl">{error}</div>;
  if (!confession) return <div className="text-text-secondary text-center py-12">Konfessiya topilmadi</div>;

  if (showKeySetup) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6 text-text-primary">E2E shifrlashni sozlash</h1>
        <KeySetup onComplete={() => setShowKeySetup(false)} />
        <button
          onClick={() => setShowKeySetup(false)}
          className="mt-4 text-text-secondary hover:text-text-primary text-sm"
        >
          Konfessiyaga qaytish
        </button>
      </div>
    );
  }

  const isAuthor = user?.id === confession.author?.id;
  const isLeaderPlus = isSuperAdmin || isQomitaRahbar || isConfessionLeader;
  const displayContent = confession.is_e2e_encrypted ? decryptedContent : confession.content;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{confession.title}</h1>
        </div>
        <div className="flex gap-2">
          {isAuthor && confession.status === 'draft' && (
            <Link to={`/confessions/${id}/edit`} className="btn-secondary flex items-center gap-2">
              <Edit3 size={16} />
              Tahrirlash
            </Link>
          )}
          <Link to="/confessions" className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} />
            Orqaga
          </Link>
        </div>
      </div>

      <div className="card p-6 mb-6">
        {/* Meta info */}
        <div className="flex flex-wrap gap-3 mb-6 text-sm">
          <span className={`badge-${confession.status === 'approved' ? 'success' : confession.status === 'rejected' ? 'danger' : confession.status === 'under_review' ? 'warning' : 'info'}`}>
            {STATUS_LABELS[confession.status] || confession.status}
          </span>
          <span className="text-text-secondary">
            Tashkilot: <strong className="text-text-primary">{confession.organization_name}</strong>
          </span>
          {confession.author && (
            <span className="text-text-secondary">
              Muallif: <strong className="text-text-primary">{confession.author.full_name || confession.author.email}</strong>
            </span>
          )}
          {confession.is_anonymous && (
            <span className="badge-neutral">Anonim</span>
          )}
          {confession.is_e2e_encrypted && (
            <span className="badge-success flex items-center gap-1">
              <Lock size={12} /> E2E shifrlangan
            </span>
          )}
          <span className="text-text-secondary">{formatDateTime(confession.created_at)}</span>
        </div>

        {/* Decrypt prompt */}
        {confession.is_e2e_encrypted && showPasswordPrompt && !decryptedContent && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-800 mb-2">
              Bu konfessiya end-to-end shifrlangan. Shifrni ochish uchun parolingizni kiriting.
            </p>
            {decryptError && (
              <p className="text-sm text-danger mb-2">{decryptError}</p>
            )}
            <div className="flex gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Shifrlash paroli"
                className="input-field flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleDecrypt()}
              />
              <button
                onClick={handleDecrypt}
                disabled={decrypting}
                className="btn-primary flex items-center gap-2"
              >
                {decrypting ? 'Ochilmoqda...' : (
                  <>
                    <Eye size={16} />
                    Ochish
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="prose max-w-none">
          {displayContent ? (
            <p className="whitespace-pre-wrap text-text-primary">{displayContent}</p>
          ) : confession.is_e2e_encrypted ? (
            <p className="text-text-secondary italic">Shifrlangan kontent — ko'rish uchun parolni kiriting</p>
          ) : (
            <p className="whitespace-pre-wrap text-text-primary">{confession.content}</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {isAuthor && confession.status === 'draft' && (
          <button onClick={() => handleTransition('submit')} className="btn-primary flex items-center gap-2">
            <Send size={16} />
            Yuborish
          </button>
        )}
        {isLeaderPlus && confession.status === 'submitted' && (
          <button onClick={() => handleTransition('review')} className="btn-primary flex items-center gap-2 bg-warning hover:bg-amber-600">
            <Eye size={16} />
            Ko'rib chiqishni boshlash
          </button>
        )}
        {isLeaderPlus && confession.status === 'under_review' && (
          <>
            <button onClick={() => handleTransition('approve')} className="btn-primary flex items-center gap-2 bg-success hover:bg-emerald-600">
              <CheckCircle size={16} />
              Tasdiqlash
            </button>
            <button onClick={() => handleTransition('reject')} className="btn-danger flex items-center gap-2">
              <XCircle size={16} />
              Rad etish
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ConfessionDetailPage;
