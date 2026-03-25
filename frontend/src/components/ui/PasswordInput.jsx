import { useState, useCallback } from 'react';
import { Eye, EyeOff, RefreshCw, Copy, Check } from 'lucide-react';

const REQUIREMENTS = [
  { key: 'length', label: 'Kamida 12 ta belgi', test: (v) => v.length >= 12 },
  { key: 'upper', label: 'Katta harf (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'Kichik harf (a-z)', test: (v) => /[a-z]/.test(v) },
  { key: 'digit', label: 'Raqam (0-9)', test: (v) => /[0-9]/.test(v) },
  { key: 'special', label: 'Maxsus belgi (!@#$%^&*)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function generatePassword(length = 16) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = upper + lower + digits + special;

  // Ensure at least one from each category
  let pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  for (let i = pwd.length; i < length; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }

  // Shuffle
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }

  return pwd.join('');
}

function getStrength(value) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 12) score++;
  if (value.length >= 16) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[a-z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return score;
}

const strengthLabels = ['', 'Juda zaif', 'Zaif', "O'rtacha", 'Yaxshi', 'Kuchli', 'Juda kuchli'];
const strengthColors = ['', 'bg-red-500', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-400', 'bg-green-500'];

function PasswordInput({ value, onChange, placeholder, label, id, showGenerator = true, showRequirements = true, className = '' }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const strength = getStrength(value);
  const allMet = REQUIREMENTS.every((r) => r.test(value || ''));

  const handleGenerate = useCallback(() => {
    const pwd = generatePassword(16);
    onChange(pwd);
    setVisible(true);
  }, [onChange]);

  const handleCopy = useCallback(() => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-field pr-24"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showGenerator && (
            <button
              type="button"
              onClick={handleGenerate}
              className="p-1.5 text-text-secondary hover:text-primary-light transition-colors rounded-md hover:bg-gray-100"
              title="Parol yaratish"
            >
              <RefreshCw size={15} />
            </button>
          )}
          {value && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 text-text-secondary hover:text-primary-light transition-colors rounded-md hover:bg-gray-100"
              title="Nusxa olish"
            >
              {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="p-1.5 text-text-secondary hover:text-primary-light transition-colors rounded-md hover:bg-gray-100"
            title={visible ? 'Yashirish' : "Ko'rsatish"}
          >
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {/* Strength meter */}
      {value && (
        <div className="mt-2">
          <div className="flex gap-1 mb-1">
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <div
                key={level}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  strength >= level ? strengthColors[level] : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-text-secondary">{strengthLabels[strength] || ''}</p>
        </div>
      )}

      {/* Requirements checklist */}
      {showRequirements && value && !allMet && (
        <ul className="mt-2 space-y-1">
          {REQUIREMENTS.map((req) => {
            const met = req.test(value || '');
            return (
              <li key={req.key} className={`text-xs flex items-center gap-1.5 ${met ? 'text-green-600' : 'text-red-500'}`}>
                <span className={`inline-block w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center ${met ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                  {met ? '✓' : ''}
                </span>
                {req.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default PasswordInput;
export { REQUIREMENTS, generatePassword, getStrength };
