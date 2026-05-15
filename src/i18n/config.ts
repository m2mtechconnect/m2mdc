/**
 * i18next configuration for M2M AURA
 * Supports English (en) and Quebec French (fr-CA)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en';
import frCA from './locales/fr-CA';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'fr-CA': { translation: frCA },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr-CA'],
    nonExplicitSupportedLngs: false,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'm2m-language',
    },
  });

export default i18n;
