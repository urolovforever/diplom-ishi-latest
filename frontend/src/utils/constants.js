export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  QOMITA_RAHBAR: 'qomita_rahbar',
  CONFESSION_LEADER: 'confession_leader',
  MEMBER: 'member',
  SECURITY_AUDITOR: 'security_auditor',
  PSYCHOLOGIST: 'psychologist',
  IT_ADMIN: 'it_admin',
};

export const CONFESSION_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const SECURITY_LEVELS = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  SECRET: 'secret',
};

export const DOCUMENT_CATEGORIES = {
  CONFESSION_DOC: 'confession_doc',
  EVIDENCE: 'evidence',
  REPORT: 'report',
  LEGAL: 'legal',
  OTHER: 'other',
};
