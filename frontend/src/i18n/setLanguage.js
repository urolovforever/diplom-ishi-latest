import i18n, { SUPPORTED_LANGUAGES, LANGUAGE_STORAGE_KEY } from './index';

export async function setLanguage(lang, { syncToBackend = true } = {}) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return;
  await i18n.changeLanguage(lang);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  document.documentElement.lang = lang;

  if (syncToBackend && localStorage.getItem('access_token')) {
    try {
      const { default: api } = await import('../api/axiosConfig');
      await api.put('/accounts/profile/', { language: lang });
    } catch {
      // best-effort; user preference still persists in localStorage
    }
  }
}
