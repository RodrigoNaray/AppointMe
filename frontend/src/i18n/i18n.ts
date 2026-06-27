import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import esCommon from '../locales/es/common.json';
import enCommon from '../locales/en/common.json';
import esAdmin from '../locales/es/admin.json';
import enAdmin from '../locales/en/admin.json';

const supportedLngs = ['es', 'en'];

const stored = typeof window !== 'undefined' ? localStorage.getItem('i18nextLng') : null;
const browser = typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : null;
const detected = stored || browser || 'es';
const lng = supportedLngs.includes(detected) ? detected : 'es';

i18n.use(initReactI18next).init({
  lng,
  fallbackLng: 'es' as const,
  supportedLngs,
  ns: ['common', 'admin'] as const,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  resources: {
    es: {
      common: esCommon,
      admin: esAdmin,
    },
    en: {
      common: enCommon,
      admin: enAdmin,
    },
  },
});

i18n.on('languageChanged', (lng: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('i18nextLng', lng);
  }
});

export default i18n;
