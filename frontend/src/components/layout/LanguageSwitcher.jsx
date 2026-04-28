import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { setLanguage } from '../../i18n/setLanguage';
import { SUPPORTED_LANGUAGES } from '../../i18n';

const LANGUAGE_LABELS = {
  uz: { code: 'UZ', name: "O'zbek" },
  ru: { code: 'RU', name: 'Русский' },
  en: { code: 'EN', name: 'English' },
};

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = i18n.language?.split('-')[0] || 'uz';
  const handleSelect = async (lang) => {
    await setLanguage(lang);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Language"
      >
        <Globe size={20} />
        <span className="hidden md:block text-sm font-medium uppercase">
          {LANGUAGE_LABELS[current]?.code || current.toUpperCase()}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-card shadow-lg border border-gray-100 py-1 animate-scale-in z-40">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = lang === current;
            return (
              <button
                key={lang}
                onClick={() => handleSelect(lang)}
                className={`w-full flex items-center justify-between gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'text-primary-light bg-primary-light/5'
                    : 'text-text-primary hover:bg-gray-50'
                }`}
              >
                <span>{LANGUAGE_LABELS[lang]?.name || lang}</span>
                {isActive && <Check size={16} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
