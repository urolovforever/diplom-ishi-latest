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
