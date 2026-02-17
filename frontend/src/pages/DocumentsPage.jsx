import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDocuments, uploadDocument, deleteDocument, fetchVersions, fetchAccessLogs } from '../store/documentsSlice';
import { useCrypto } from '../hooks/useCrypto';
import { useAuth } from '../hooks/useAuth';
import { formatDate, formatDateTime } from '../utils/helpers';
import KeySetup from '../components/auth/KeySetup';
import Modal from '../components/ui/Modal';
import {
  Upload, Eye, Download, Trash2, Filter, ChevronDown, ChevronUp,
  Lock, FileText, Search, X, CloudUpload, ClipboardList,
} from 'lucide-react';

function DocumentsPage() {
  const dispatch = useDispatch();
  const { list, count, versions, accessLogs, loading } = useSelector((state) => state.documents);
  const { isE2EReady, encryptDocument, decryptDocument, getRecipientPublicKeys } = useCrypto();
  const { user } = useAuth();

  const [showUpload, setShowUpload] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [useE2E, setUseE2E] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [auditDoc, setAuditDoc] = useState(null);

  const isAdmin = user?.role?.name === 'super_admin' || user?.role?.name === 'qomita_rahbar';

  useEffect(() => {
    dispatch(fetchDocuments());
  }, [dispatch]);

  const openAuditLog = (doc) => {
    setAuditDoc(doc);
    if (!accessLogs[doc.id]) {
      dispatch(fetchAccessLogs(doc.id));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);

    try {
      if (useE2E && isE2EReady) {
        const recipientPublicKeys = await getRecipientPublicKeys([user.id]);
        if (recipientPublicKeys.length > 0) {
          const { encryptedBlob, encryptedKeys } = await encryptDocument(file, recipientPublicKeys);
          const formData = new FormData();
          formData.append('title', title);
          formData.append('description', description);
          formData.append('file', new File([encryptedBlob], file.name));
          formData.append('is_e2e_encrypted', 'true');
          formData.append('encrypted_keys', JSON.stringify(encryptedKeys));
          await dispatch(uploadDocument(formData));
        } else {
          const formData = new FormData();
          formData.append('title', title);
          formData.append('description', description);
          formData.append('file', file);
          await dispatch(uploadDocument(formData));
        }
      } else {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('file', file);
        await dispatch(uploadDocument(formData));
      }

      setTitle('');
      setDescription('');
      setFile(null);
      setShowUpload(false);
      dispatch(fetchDocuments());
    } catch (err) {
      alert("Yuklashda xatolik: " + (err.message || "Noma'lum xatolik"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bu hujjatni o'chirishni xohlaysizmi?")) {
      dispatch(deleteDocument(id));
    }
  };

  const handleDownload = async (doc) => {
    if (doc.is_e2e_encrypted && doc.encrypted_keys?.length > 0) {
      const password = prompt("Hujjatni shifrlash uchun parolingizni kiriting:");
      if (!password) return;
      try {
        const response = await fetch(doc.file);
        const encryptedBlob = await response.blob();
        const decryptedBuffer = await decryptDocument(
          encryptedBlob,
          doc.encrypted_keys[0]?.iv || '',
          doc.encrypted_keys,
          user.id,
          password
        );
        const blob = new Blob([decryptedBuffer]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.title;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        alert("Shifrni ochishda xatolik. Parolingizni tekshiring.");
      }
    } else if (doc.file) {
      window.open(doc.file, '_blank');
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

  const handleDrag = (e) => {
    e.preventDefault();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const filteredList = searchQuery
    ? list.filter((d) => d.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : list;

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
            {count > 0 ? `Jami ${count} ta hujjat` : "Barcha hujjatlar"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center gap-2"
          >
            <Filter size={16} />
            Filtr
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Upload size={16} />
            Yuklash
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card p-4 mb-6 animate-fade-in">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Hujjat nomini qidiring..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9"
              />
            </div>
          </div>
        </div>
      )}

      {/* Documents table */}
      {loading ? (
        <div className="card p-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Nomi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Yuklagan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Sana</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">E2E</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredList.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-primary-light flex-shrink-0" />
                        <div>
                          <span className="font-medium text-text-primary">{doc.title}</span>
                          {doc.description && (
                            <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{doc.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {doc.uploaded_by?.full_name || doc.uploaded_by?.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {doc.is_e2e_encrypted ? (
                        <span className="badge-success flex items-center gap-1 w-fit">
                          <Lock size={12} /> Ha
                        </span>
                      ) : (
                        <span className="badge-neutral">Yo'q</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleVersions(doc.id)}
                          className="p-1.5 text-primary-light hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ko'rish"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 text-success hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Yuklab olish"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 text-danger hover:bg-red-50 rounded-lg transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 size={16} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => openAuditLog(doc)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Kim ko'rganini ko'rish"
                          >
                            <ClipboardList size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {expandedDoc && versions[expandedDoc] && (
                  <tr>
                    <td colSpan="5" className="px-4 py-3 bg-surface">
                      <p className="text-sm font-medium text-text-primary mb-2">Versiya tarixi</p>
                      {versions[expandedDoc].length > 0 ? (
                        <ul className="text-sm text-text-secondary space-y-1">
                          {versions[expandedDoc].map((v) => (
                            <li key={v.id}>
                              v{v.version_number} - {v.change_summary || "Izoh yo'q"} ({formatDate(v.created_at)})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-text-secondary">Versiyalar topilmadi</p>
                      )}
                    </td>
                  </tr>
                )}
                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-12 text-center text-text-secondary">
                      Hujjatlar topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {count > 0 && (
            <div className="px-4 py-3 bg-surface text-sm text-text-secondary border-t border-gray-100">
              Jami {count} ta hujjat
            </div>
          )}
        </div>
      )}

      {/* Audit Log Modal */}
      <Modal
        isOpen={!!auditDoc}
        onClose={() => setAuditDoc(null)}
        title={`Audit trail: ${auditDoc?.title || ''}`}
        maxWidth="max-w-2xl"
      >
        {auditDoc && (
          <div>
            <p className="text-sm text-text-secondary mb-4">
              Bu hujjatni kim, qachon va qanday ko'rgan/yuklab olganini ko'ring.
            </p>
            {accessLogs[auditDoc.id]?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface">
                      <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">Foydalanuvchi</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">Amal</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">IP manzil</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">Vaqti</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {accessLogs[auditDoc.id].map((log) => (
                      <tr key={log.id} className="hover:bg-surface/50">
                        <td className="px-3 py-2 text-text-primary">
                          {log.user?.full_name || log.user?.email || '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            log.action === 'download'
                              ? 'bg-blue-100 text-blue-700'
                              : log.action === 'view'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {log.action === 'download' ? 'Yuklab oldi' : log.action === 'view' ? "Ko'rdi" : log.action}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-text-secondary font-mono text-xs">{log.ip_address || '-'}</td>
                        <td className="px-3 py-2 text-text-secondary">{formatDateTime(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-text-secondary text-center py-8">
                Bu hujjat hali hech kim tomonidan ko'rilmagan.
              </p>
            )}
          </div>
        )}
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

          {/* E2E toggle */}
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
                <button type="button" onClick={() => { setShowUpload(false); setShowKeySetup(true); }} className="text-primary-light hover:underline">
                  Hozir sozlash
                </button>
              </div>
            )}
            {useE2E && isE2EReady && (
              <p className="mt-1 text-xs text-success flex items-center gap-1">
                <Lock size={12} /> Fayl brauzeringizda shifrlangan holda yuklanadi
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
