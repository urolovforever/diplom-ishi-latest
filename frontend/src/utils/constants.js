export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  QOMITA_RAHBAR: 'qomita_rahbar',
  CONFESSION_LEADER: 'confession_leader',
  MEMBER: 'member',
};

export const CONFESSION_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};
