import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import uzCommon from './locales/uz/common.json';
import uzAuth from './locales/uz/auth.json';
import uzNav from './locales/uz/nav.json';
import uzDashboard from './locales/uz/dashboard.json';
import uzDocuments from './locales/uz/documents.json';
import uzUsers from './locales/uz/users.json';
import uzOrganizations from './locales/uz/organizations.json';
import uzNotifications from './locales/uz/notifications.json';
import uzAdmin from './locales/uz/admin.json';
import uzAi from './locales/uz/ai.json';
import uzAudit from './locales/uz/audit.json';
import uzProfile from './locales/uz/profile.json';
import uzSettings from './locales/uz/settings.json';
import uzErrors from './locales/uz/errors.json';

import ruCommon from './locales/ru/common.json';
import ruAuth from './locales/ru/auth.json';
import ruNav from './locales/ru/nav.json';
import ruDashboard from './locales/ru/dashboard.json';
import ruDocuments from './locales/ru/documents.json';
import ruUsers from './locales/ru/users.json';
import ruOrganizations from './locales/ru/organizations.json';
import ruNotifications from './locales/ru/notifications.json';
import ruAdmin from './locales/ru/admin.json';
import ruAi from './locales/ru/ai.json';
import ruAudit from './locales/ru/audit.json';
import ruProfile from './locales/ru/profile.json';
import ruSettings from './locales/ru/settings.json';
import ruErrors from './locales/ru/errors.json';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enNav from './locales/en/nav.json';
import enDashboard from './locales/en/dashboard.json';
import enDocuments from './locales/en/documents.json';
import enUsers from './locales/en/users.json';
import enOrganizations from './locales/en/organizations.json';
import enNotifications from './locales/en/notifications.json';
import enAdmin from './locales/en/admin.json';
import enAi from './locales/en/ai.json';
import enAudit from './locales/en/audit.json';
import enProfile from './locales/en/profile.json';
import enSettings from './locales/en/settings.json';
import enErrors from './locales/en/errors.json';

export const SUPPORTED_LANGUAGES = ['uz', 'ru', 'en'];
export const DEFAULT_LANGUAGE = 'uz';
export const LANGUAGE_STORAGE_KEY = 'scp_language';

const resources = {
  uz: {
    common: uzCommon,
    auth: uzAuth,
    nav: uzNav,
    dashboard: uzDashboard,
    documents: uzDocuments,
    users: uzUsers,
    organizations: uzOrganizations,
    notifications: uzNotifications,
    admin: uzAdmin,
    ai: uzAi,
    audit: uzAudit,
    profile: uzProfile,
    settings: uzSettings,
    errors: uzErrors,
  },
  ru: {
    common: ruCommon,
    auth: ruAuth,
    nav: ruNav,
    dashboard: ruDashboard,
    documents: ruDocuments,
    users: ruUsers,
    organizations: ruOrganizations,
    notifications: ruNotifications,
    admin: ruAdmin,
    ai: ruAi,
    audit: ruAudit,
    profile: ruProfile,
    settings: ruSettings,
    errors: ruErrors,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    nav: enNav,
    dashboard: enDashboard,
    documents: enDocuments,
    users: enUsers,
    organizations: enOrganizations,
    notifications: enNotifications,
    admin: enAdmin,
    ai: enAi,
    audit: enAudit,
    profile: enProfile,
    settings: enSettings,
    errors: enErrors,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    ns: ['common', 'auth', 'nav', 'dashboard', 'documents', 'users', 'organizations', 'notifications', 'admin', 'ai', 'audit', 'profile', 'settings', 'errors'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    returnEmptyString: false,
  });

export default i18n;
