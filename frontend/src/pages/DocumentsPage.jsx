import { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDocuments, uploadDocument, deleteDocument, markDocumentsRead } from '../store/documentsSlice';
import confessionsAPI from '../api/confessionsAPI';
import { useCrypto } from '../hooks/useCrypto';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/helpers';
import KeySetup from '../components/auth/KeySetup';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import {
  Upload, Download, Trash2, Search, X, CloudUpload,
  Lock, FileText, Building2, Send, Inbox, Filter,
} from 'lucide-react';

function DocumentsPage() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.documents);
  const { isE2EReady, encryptDocument, decryptDocument, getRecipientPublicKeys } = useCrypto();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('sent');
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [decryptModal, setDecryptModal] = useState({ open: false, doc: null });
  const [decryptPassword, setDecryptPassword] = useState('');

  // Table filters
  const [orgFilter, setOrgFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Organizations & confessions for sharing
  const [organizations, setOrganizations] = useState([]);
  const [confessions, setConfessions] = useState([]);
  const [selectedOrgs, setSelectedOrgs] = useState([]);
  const [selectedConfs, setSelectedConfs] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [confFilter, setConfFilter] = useState('');

  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await confessionsAPI.getOrganizations();
      setOrganizations(res.data.results || res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchConfessions = useCallback(async () => {
    try {
      const res = await confessionsAPI.getConfessions();
      setConfessions(res.data.results || res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    dispatch(fetchDocuments());
    fetchOrganizations();
    fetchConfessions();
  }, [dispatch, fetchOrganizations, fetchConfessions]);

  // Helper: get sender org text for searching
  const getSenderOrgText = (doc) => {
    const u = doc.uploaded_by;
    if (!u) return '';
    const parts = [];
    if (u.organization_name) parts.push(u.organization_name);
    if (u.confession_name) parts.push(u.confession_name);
    return parts.join(' ');
  };

  // Helper: get recipient org names text for searching
  const getRecipientsText = (doc) => {
    if (!doc.shares?.length) return '';
    return doc.shares.map((s) => s.organization?.name || '').join(' ');
  };

  // Apply filters helper
  const applyFilters = (docs) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter((d) =>
        d.title?.toLowerCase().includes(q) ||
        getRecipientsText(d).toLowerCase().includes(q) ||
        getSenderOrgText(d).toLowerCase().includes(q) ||
        (d.uploaded_by?.full_name || '').toLowerCase().includes(q)
      );
    }
    if (orgFilter) {
      docs = docs.filter((d) =>
        d.shares?.some((s) => s.organization?.id === orgFilter) ||
        d.uploaded_by?.organization === orgFilter ||
        d.uploaded_by?.confession === orgFilter
      );
    }
    if (userFilter) {
      docs = docs.filter((d) => d.uploaded_by?.id === userFilter);
    }
    if (dateFilter) {
      docs = docs.filter((d) => d.created_at?.startsWith(dateFilter));
    }
    return docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  // Split documents into sent and received, apply search + filters
  const sentDocs = useMemo(() => {
    const docs = list.filter((d) => d.uploaded_by?.id === user?.id);
    return applyFilters(docs);
  }, [list, user, searchQuery, orgFilter, userFilter, dateFilter]);

  const receivedDocs = useMemo(() => {
    const docs = list.filter((d) => d.uploaded_by?.id !== user?.id);
    return applyFilters(docs);
  }, [list, user, searchQuery, orgFilter, userFilter, dateFilter]);

  const currentDocs = activeTab === 'sent' ? sentDocs : receivedDocs;

  // Count unread received docs
  const unreadReceivedCount = useMemo(() => {
    return list.filter((d) => d.uploaded_by?.id !== user?.id && d.is_new).length;
  }, [list, user]);

  // Build filter options based on active tab
  const sentOrgOptions = useMemo(() => {
    const orgMap = new Map();
    list
      .filter((d) => d.uploaded_by?.id === user?.id)
      .forEach((d) => {
        d.shares?.forEach((s) => {
          if (s.organization) orgMap.set(s.organization.id, s.organization.name);
        });
      });
    return [...orgMap.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [list, user]);

  const receivedOrgOptions = useMemo(() => {
    const orgMap = new Map();
    list
      .filter((d) => d.uploaded_by?.id !== user?.id)
      .forEach((d) => {
        const u = d.uploaded_by;
        if (u?.organization_name) {
          const key = u.organization || u.confession || u.organization_name;
          orgMap.set(key, u.organization_name);
        }
      });
    return [...orgMap.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [list, user]);

  // Build user filter options
  const userOptions = useMemo(() => {
    const userMap = new Map();
    const baseDocs = activeTab === 'sent'
      ? list.filter((d) => d.uploaded_by?.id === user?.id)
      : list.filter((d) => d.uploaded_by?.id !== user?.id);
    baseDocs.forEach((d) => {
      const u = d.uploaded_by;
      if (u?.id) userMap.set(u.id, u.full_name || u.email);
    });
    return [...userMap.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [list, user, activeTab]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    if (!isE2EReady) {
      setShowUpload(false);
      setShowKeySetup(true);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);

      // Collect all org IDs: directly selected + all orgs under selected confessions
      const confOrgIds = organizations
        .filter((o) => selectedConfs.includes(o.confession))
        .map((o) => o.id);
      const allOrgIds = [...new Set([...selectedOrgs, ...confOrgIds])];
      if (allOrgIds.length > 0) {
        formData.append('shared_with_organizations', JSON.stringify(allOrgIds));
      }

      const recipientPublicKeys = await getRecipientPublicKeys([user.id]);
      if (recipientPublicKeys.length > 0) {
        const { encryptedBlob, iv, encryptedKeys } = await encryptDocument(file, recipientPublicKeys);
        formData.append('file', new File([encryptedBlob], file.name));
        formData.append('is_e2e_encrypted', 'true');
        formData.append('file_iv', iv);
        formData.append('encrypted_keys', JSON.stringify(encryptedKeys));
      } else {
        formData.append('file', file);
      }

      await dispatch(uploadDocument(formData));

      setTitle('');
      setDescription('');
      setFile(null);
      setSelectedOrgs([]);
      setSelectedConfs([]);
      setRecipientSearch('');
      setConfFilter('');
      setShowUpload(false);
      dispatch(fetchDocuments());
    } catch (err) {
      alert("Yuklashda xatolik: " + (err.message || "Noma'lum xatolik"));
    } finally {
      setUploading(false);
    }
  };

  const toggleOrgSelection = (orgId) => {
    setSelectedOrgs((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]
    );
  };

  const toggleConfSelection = (confId) => {
    setSelectedConfs((prev) =>
      prev.includes(confId) ? prev.filter((id) => id !== confId) : [...prev, confId]
    );
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bu hujjatni o'chirishni xohlaysizmi?")) {
      dispatch(deleteDocument(id));
    }
  };

  const handleMarkRead = (docId) => {
    dispatch(markDocumentsRead({ ids: [docId] }));
  };

  const handleDownload = async (doc) => {
    // Mark as read when downloading a received document
    if (doc.is_new) handleMarkRead(doc.id);

    if (doc.is_e2e_encrypted && doc.encrypted_keys?.length > 0) {
      if (!doc.file_iv) {
        alert("Bu hujjatning shifrlash kaliti (IV) topilmadi. Faylni ochib bo'lmaydi.");
        return;
      }
      setDecryptPassword('');
      setDecryptModal({ open: true, doc });
    } else if (doc.file) {
      window.open(doc.file, '_blank');
    }
  };

  const handleDecryptSubmit = async (e) => {
    e.preventDefault();
    const doc = decryptModal.doc;
    if (!doc || !decryptPassword) return;
    try {
      const response = await fetch(doc.file);
      const encryptedBlob = await response.blob();
      const decryptedBuffer = await decryptDocument(
        encryptedBlob,
        doc.file_iv,
        doc.encrypted_keys,
        user.id,
        decryptPassword
      );
      const blob = new Blob([decryptedBuffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.title;
      a.click();
      URL.revokeObjectURL(url);
      setDecryptModal({ open: false, doc: null });
      setDecryptPassword('');
    } catch {
      alert("Shifrni ochishda xatolik. Parolingizni tekshiring.");
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  // Helper: format sender org info
  const getSenderOrg = (doc) => {
    const uploader = doc.uploaded_by;
    if (!uploader) return '—';
    const orgName = uploader.organization_name;
    const confName = uploader.confession_name;
    if (!orgName) return '—';
    // If user belongs to an organization (DT) and has a confession, show "OrgName (ConfessionName)"
    if (uploader.organization && confName) {
      return (
        <span>
          {orgName} <span className="text-text-secondary">({confName})</span>
        </span>
      );
    }
    return orgName;
  };

  // Helper: format recipient list
  const getRecipients = (doc) => {
    if (!doc.shares || doc.shares.length === 0) return <span className="text-text-secondary">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {doc.shares.map((s) => (
          <Badge key={s.id} variant="info">{s.organization?.name}</Badge>
        ))}
      </div>
    );
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Hujjatlar</h1>
          <p className="text-sm text-text-secondary mt-1">
            Hujjatlarni yuborish va qabul qilish
          </p>
        </div>
        <button
          onClick={() => { setShowUpload(true); setRecipientSearch(''); setConfFilter(''); setSelectedOrgs([]); setSelectedConfs([]); }}
          className="btn-primary flex items-center gap-2"
        >
          <Upload size={16} />
          Yuklash
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-surface rounded-xl p-1">
        <button
          onClick={() => { setActiveTab('sent'); setOrgFilter(''); setUserFilter(''); setDateFilter(''); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'sent'
              ? 'bg-white text-primary-light shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Send size={16} />
          Yuborilgan
          {sentDocs.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'sent' ? 'bg-primary-light/10 text-primary-light' : 'bg-gray-200 text-gray-600'
            }`}>
              {sentDocs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('received'); setOrgFilter(''); setUserFilter(''); setDateFilter(''); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'received'
              ? 'bg-white text-primary-light shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Inbox size={16} />
          Qabul qilingan
          {unreadReceivedCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-danger text-white font-bold">
              {unreadReceivedCount}
            </span>
          )}
          {receivedDocs.length > 0 && unreadReceivedCount === 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'received' ? 'bg-primary-light/10 text-primary-light' : 'bg-gray-200 text-gray-600'
            }`}>
              {receivedDocs.length}
            </span>
          )}
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Nomi bo'yicha qidiring..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="input-field py-2 text-sm flex-1"
          >
            <option value="">Barcha tashkilotlar</option>
            {(activeTab === 'sent' ? sentOrgOptions : receivedOrgOptions).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="input-field py-2 text-sm flex-1"
          >
            <option value="">Barcha foydalanuvchilar</option>
            {userOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input-field py-2 text-sm flex-1"
          />
          {(orgFilter || userFilter || dateFilter) && (
            <button
              onClick={() => { setOrgFilter(''); setUserFilter(''); setDateFilter(''); }}
              className="btn-secondary flex items-center gap-1 text-sm whitespace-nowrap"
            >
              <X size={14} />
              Tozalash
            </button>
          )}
        </div>
      </div>

      {/* Documents table */}
      {loading ? (
        <div className="card p-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      ) : (
        {/* Mobile card view */}
        <div className="space-y-3 md:hidden">
          {currentDocs.map((doc) => (
            <div key={doc.id} className={`card p-4 ${doc.is_new ? 'border-l-4 border-primary-light bg-blue-50/60' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2 min-w-0">
                  <FileText size={16} className="text-primary-light flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-medium text-text-primary">
                      {doc.title}
                      {doc.is_new && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-light text-white uppercase">
                          Yangi
                        </span>
                      )}
                    </span>
                    {doc.description && (
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{doc.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-1.5 text-success hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Yuklab olish"
                  >
                    <Download size={16} />
                  </button>
                  {doc.uploaded_by?.id === user?.id && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 text-danger hover:bg-red-50 rounded-lg transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                <span>{activeTab === 'sent' ? getRecipients(doc) : getSenderOrg(doc)}</span>
                <span>{doc.uploaded_by?.full_name || doc.uploaded_by?.email || '—'}</span>
                <span>{formatDate(doc.created_at)}</span>
              </div>
            </div>
          ))}
          {currentDocs.length === 0 && (
            <div className="card p-8 text-center text-text-secondary text-sm">
              {searchQuery || orgFilter || userFilter || dateFilter
                ? "Qidiruv natijasi topilmadi"
                : activeTab === 'sent'
                  ? "Yuborilgan hujjatlar topilmadi"
                  : "Qabul qilingan hujjatlar topilmadi"
              }
            </div>
          )}
          {currentDocs.length > 0 && (
            <div className="text-sm text-text-secondary text-center py-2">
              Jami {currentDocs.length} ta hujjat
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="card overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Nomi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                    Tashkilot
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">
                    Foydalanuvchi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Sana</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentDocs.map((doc) => (
                  <tr key={doc.id} className={`hover:bg-surface/50 transition-colors ${
                    doc.is_new ? 'bg-blue-50/60 border-l-4 border-primary-light' : ''
                  }`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-primary-light flex-shrink-0" />
                        <div>
                          <span className="font-medium text-text-primary">
                            {doc.title}
                            {doc.is_new && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-light text-white uppercase">
                                Yangi
                              </span>
                            )}
                          </span>
                          {doc.description && (
                            <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{doc.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {activeTab === 'sent' ? getRecipients(doc) : getSenderOrg(doc)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {doc.uploaded_by?.full_name || doc.uploaded_by?.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 text-success hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Yuklab olish"
                        >
                          <Download size={16} />
                        </button>
                        {doc.uploaded_by?.id === user?.id && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 text-danger hover:bg-red-50 rounded-lg transition-colors"
                            title="O'chirish"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {currentDocs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-text-secondary">
                      {searchQuery || orgFilter || userFilter || dateFilter
                        ? "Qidiruv natijasi topilmadi"
                        : activeTab === 'sent'
                          ? "Yuborilgan hujjatlar topilmadi"
                          : "Qabul qilingan hujjatlar topilmadi"
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {currentDocs.length > 0 && (
            <div className="px-4 py-3 bg-surface text-sm text-text-secondary border-t border-gray-100">
              Jami {currentDocs.length} ta hujjat
            </div>
          )}
        </div>
      )}

      {/* Decrypt Password Modal */}
      <Modal isOpen={decryptModal.open} onClose={() => { setDecryptModal({ open: false, doc: null }); setDecryptPassword(''); }} title="E2E shifrlash paroli">
        <form onSubmit={handleDecryptSubmit} className="space-y-4">
          <p className="text-sm text-text-secondary">
            Hujjatni ochish uchun E2E shifrlash parolingizni kiriting (KeySetup'da qo'ygan parol):
          </p>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Parol</label>
            <input
              type="password"
              value={decryptPassword}
              onChange={(e) => setDecryptPassword(e.target.value)}
              className="input-field"
              placeholder="Parolni kiriting..."
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setDecryptModal({ open: false, doc: null }); setDecryptPassword(''); }} className="btn-secondary">
              Bekor qilish
            </button>
            <button type="submit" disabled={!decryptPassword} className="btn-primary flex items-center gap-2">
              <Lock size={14} />
              Ochish
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Modal */}
      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Hujjat yuklash">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Nomi</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Hujjat nomi"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Tavsif</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input-field"
              placeholder="Qisqacha tavsif..."
            />
          </div>

          {/* Drag-drop zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-primary-light bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <CloudUpload size={36} className="mx-auto mb-3 text-text-secondary" />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText size={16} className="text-primary-light" />
                <span className="text-sm font-medium">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} className="text-text-secondary hover:text-danger">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-text-secondary mb-1">Faylni shu yerga tashlang yoki</p>
                <label className="text-sm text-primary-light hover:text-primary cursor-pointer font-medium">
                  faylni tanlang
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>

          {/* Recipient selector */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              <span className="flex items-center gap-1">
                <Building2 size={14} />
                Kimga yuborish
              </span>
            </label>

            {/* Confession filter */}
            <select
              value={confFilter}
              onChange={(e) => setConfFilter(e.target.value)}
              className="input-field py-1.5 text-sm w-full mb-2"
            >
              <option value="">Konfessiya tanlang...</option>
              {confessions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Search input */}
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              <input
                type="search"
                placeholder={confFilter ? "Tashkilot nomini yozing..." : "Avval konfessiya tanlang yoki nom yozing..."}
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                className="input-field pl-8 py-1.5 text-sm w-full"
              />
            </div>

            {/* Results list */}
            {(confFilter || recipientSearch.length > 0) && (
              <div className="border border-gray-200 rounded-xl max-h-52 overflow-y-auto">
                {(() => {
                  const q = recipientSearch.toLowerCase();
                  const myOrgId = user?.organization;
                  const myConfId = user?.confession;
                  const filteredConfs = confessions.filter((c) => {
                    if (confFilter && c.id !== confFilter) return false;
                    if (q && !c.name.toLowerCase().includes(q)) return false;
                    return true;
                  });
                  const filteredOrgs = organizations.filter((o) => {
                    if (o.id === myOrgId) return false;
                    if (confFilter && o.confession !== confFilter) return false;
                    if (q && !o.name.toLowerCase().includes(q)) return false;
                    return true;
                  });
                  const hasResults = filteredConfs.length > 0 || filteredOrgs.length > 0;

                  if (!hasResults) {
                    return (
                      <div className="px-3 py-4 text-center text-sm text-text-secondary">
                        Natija topilmadi
                      </div>
                    );
                  }

                  return (
                    <>
                      {filteredConfs.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 bg-blue-50 text-xs font-semibold text-primary-light sticky top-0 border-b">
                            Konfessiyalar
                          </div>
                          {filteredConfs.map((c) => (
                            <label
                              key={`conf-${c.id}`}
                              className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface/50 transition-colors ${
                                selectedConfs.includes(c.id) ? 'bg-blue-50' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedConfs.includes(c.id)}
                                onChange={() => toggleConfSelection(c.id)}
                                className="rounded border-gray-300 text-primary-light focus:ring-primary-light"
                              />
                              <span className="text-sm font-medium text-text-primary">{c.name}</span>
                              <Badge variant="primary">Konfessiya</Badge>
                            </label>
                          ))}
                        </>
                      )}
                      {filteredOrgs.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 bg-surface text-xs font-semibold text-text-secondary sticky top-0 border-b">
                            Diniy tashkilotlar
                          </div>
                          {filteredOrgs.map((o) => (
                            <label
                              key={`org-${o.id}`}
                              className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface/50 transition-colors ${
                                selectedOrgs.includes(o.id) ? 'bg-blue-50' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedOrgs.includes(o.id)}
                                onChange={() => toggleOrgSelection(o.id)}
                                className="rounded border-gray-300 text-primary-light focus:ring-primary-light"
                              />
                              <span className="text-sm text-text-primary">{o.name}</span>
                              <span className="text-xs text-text-secondary">({o.confession_name})</span>
                            </label>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Selected chips */}
            {(selectedConfs.length > 0 || selectedOrgs.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedConfs.map((id) => {
                  const c = confessions.find((x) => x.id === id);
                  return c ? (
                    <span key={`sc-${id}`} className="inline-flex items-center gap-1 bg-blue-100 text-primary-light text-xs px-2 py-1 rounded-full font-medium">
                      {c.name} (konfessiya)
                      <button type="button" onClick={() => toggleConfSelection(id)} className="hover:text-danger"><X size={12} /></button>
                    </span>
                  ) : null;
                })}
                {selectedOrgs.map((id) => {
                  const o = organizations.find((x) => x.id === id);
                  return o ? (
                    <span key={`so-${id}`} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-full">
                      {o.name}
                      <button type="button" onClick={() => toggleOrgSelection(id)} className="hover:text-danger"><X size={12} /></button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* E2E info */}
          <div className="p-3 bg-surface rounded-xl">
            <p className="text-sm text-text-primary flex items-center gap-2">
              <Lock size={14} className="text-success" />
              Hujjat E2E shifrlangan holda yuklanadi
            </p>
            {!isE2EReady && (
              <p className="mt-2 text-sm text-warning">
                E2E shifrlash sozlanmagan. Yuklash tugmasini bosganingizda sozlash sahifasi ochiladi.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary">
              Bekor qilish
            </button>
            <button type="submit" disabled={uploading || !file} className="btn-primary">
              {uploading ? 'Yuklanmoqda...' : 'Yuklash'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default DocumentsPage;
