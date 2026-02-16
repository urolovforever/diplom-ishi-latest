export const required = (value) =>
  value && value.trim() ? null : 'This field is required';

export const email = (value) => {
  if (!value) return null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(value) ? null : 'Invalid email address';
};

export const minLength = (min) => (value) => {
  if (!value) return null;
  return value.length >= min ? null : `Must be at least ${min} characters`;
};

export const passwordStrength = (value) => {
  if (!value) return null;
  if (value.length < 12) return 'Must be at least 12 characters';
  if (!/[A-Z]/.test(value)) return 'Must contain an uppercase letter';
  if (!/[a-z]/.test(value)) return 'Must contain a lowercase letter';
  if (!/[0-9]/.test(value)) return 'Must contain a number';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Must contain a special character';
  return null;
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  qomita_rahbar: 'Qomita Rahbar',
  confession_leader: 'Confession Leader',
  member: 'Member',
  security_auditor: 'Security Auditor',
  psychologist: 'Psychologist',
  it_admin: 'IT Admin',
};

export const SECURITY_LEVEL_LABELS = {
  public: 'Public',
  internal: 'Internal',
  confidential: 'Confidential',
  secret: 'Secret',
};

export const DOCUMENT_CATEGORY_LABELS = {
  confession_doc: 'Confession Document',
  evidence: 'Evidence',
  report: 'Report',
  legal: 'Legal',
  other: 'Other',
};
