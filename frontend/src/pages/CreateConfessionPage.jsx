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
import { Lock, Send, ArrowLeft } from 'lucide-react';

function CreateConfessionPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, organizations } = useSelector((state) => state.confessions);
  const { user } = useSelector((state) => state.auth);
  const { isE2EReady, encryptConfession, getRecipientPublicKeys } = useCrypto();

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
      if (isEdit) {
        const data = { title, content, organization, is_anonymous: isAnonymous };
        const result = await dispatch(updateConfession({ id, data }));
        if (updateConfession.rejected.match(result)) throw new Error("Yangilash amalga oshmadi");
      } else {
        const selectedOrg = organizations.find((o) => o.id === organization);
        const recipientUserIds = new Set();
        recipientUserIds.add(user.id);
        if (selectedOrg?.leader?.id) {
          recipientUserIds.add(selectedOrg.leader.id);
        }

        let data;
        if (useE2E && isE2EReady) {
          const recipientPublicKeys = await getRecipientPublicKeys([...recipientUserIds]);
          if (recipientPublicKeys.length > 0) {
            const { encryptedContent, encryptedKeys } = await encryptConfession(content, recipientPublicKeys);
            data = {
              title,
              content: encryptedContent,
              organization,
              is_anonymous: isAnonymous,
              is_e2e_encrypted: true,
              encrypted_keys: encryptedKeys,
            };
          } else {
            data = { title, content, organization, is_anonymous: isAnonymous };
          }
        } else {
          data = { title, content, organization, is_anonymous: isAnonymous };
        }

        const result = await dispatch(createConfession(data));
        if (createConfession.rejected.match(result)) throw new Error("Yaratish amalga oshmadi");
      }
      navigate('/confessions');
    } catch (err) {
      setError(err.message || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  if (showKeySetup) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6 text-text-primary">E2E shifrlashni sozlash</h1>
        <KeySetup onComplete={() => setShowKeySetup(false)} />
        <button
          onClick={() => setShowKeySetup(false)}
          className="mt-4 text-text-secondary hover:text-text-primary text-sm"
        >
          Hozircha o'tkazib yuborish
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          {isEdit ? "Konfessiyani tahrirlash" : "Yangi konfessiya"}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {isEdit ? "Konfessiya ma'lumotlarini yangilang" : "Yangi konfessiya yarating"}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-danger p-3 rounded-xl mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Sarlavha</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            placeholder="Konfessiya sarlavhasi"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Mazmun</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="input-field"
            placeholder="Konfessiya mazmunini kiriting..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Tashkilot</label>
          <select
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className="input-field"
            required
          >
            <option value="">Tashkilotni tanlang...</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-text-primary">Anonim yuborish</span>
          </label>
        </div>

        {!isEdit && (
          <div className="p-3 bg-surface rounded-xl">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useE2E}
                onChange={(e) => setUseE2E(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-text-primary">
                End-to-End shifrlash
              </span>
            </label>
            {useE2E && !isE2EReady && (
              <div className="mt-2 text-sm text-warning">
                E2E shifrlash sozlanmagan.{' '}
                <button
                  type="button"
                  onClick={() => setShowKeySetup(true)}
                  className="text-primary-light hover:underline"
                >
                  Hozir sozlash
                </button>
              </div>
            )}
            {useE2E && isE2EReady && (
              <p className="mt-1 text-xs text-success flex items-center gap-1">
                <Lock size={12} /> Mazmun brauzeringizda shifrlangan holda yuboriladi
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
            <Send size={16} />
            {submitting ? 'Saqlanmoqda...' : isEdit ? 'Yangilash' : 'Yaratish'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/confessions')}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Bekor qilish
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateConfessionPage;
