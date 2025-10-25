import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './en/translation.json';
import deTranslation from './de/translation.json';


const browserLang = (typeof navigator !== 'undefined'
  ? (navigator.language || (navigator.languages && navigator.languages[0]))
  : undefined) as string | undefined;
const langCode = browserLang ? browserLang.slice(0, 2).toLowerCase() : undefined;
const supportedLangs = ['en', 'de'];
const defaultLng = supportedLangs.includes(langCode || '') ? (langCode as 'en' | 'de') : 'en';

i18next.use(initReactI18next).init({
  lng: defaultLng,
  debug: false,
  resources: {
    en: {
      translation: enTranslation,
    },
    de: {
      translation: deTranslation,
    }
  },
});
