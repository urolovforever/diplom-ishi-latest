export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  QOMITA_RAHBAR: 'qomita_rahbar',
  QOMITA_XODIMI: 'qomita_xodimi',
  KONFESSIYA_RAHBARI: 'konfessiya_rahbari',
  KONFESSIYA_XODIMI: 'konfessiya_xodimi',
  ADLIYA_XODIMI: 'adliya_xodimi',
  KENGASH_AZO: 'kengash_azo',
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
  REGISTRATION: 'registration',
  REPORTS: 'reports',
  NORMATIVE: 'normative',
  CONFIDENTIAL: 'confidential',
};
