import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files directly
import enTranslation from './locales/en/translation';
import idTranslation from './locales/id/translation';

console.log('Loading translations:', { enTranslation, idTranslation });

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Don't set lng here - let detector handle it
    fallbackLng: 'en',
    debug: true,

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false,
    },

    resources: {
      en: {
        translation: enTranslation,
      },
      id: {
        translation: idTranslation,
      },
    },
  })
  .then(() => {
    console.log('i18n initialized successfully!');
    console.log('Current language:', i18n.language);
    console.log('Available languages:', i18n.languages);
    console.log('localStorage i18nextLng:', localStorage.getItem('i18nextLng'));
    
    // Force detection from localStorage on initial load
    const savedLang = localStorage.getItem('i18nextLng');
    if (savedLang && savedLang !== i18n.language) {
      console.log('Forcing language change to saved language:', savedLang);
      i18n.changeLanguage(savedLang);
    }
  })
  .catch((error: any) => {
    console.error('i18n initialization failed:', error);
  });

export default i18n;
