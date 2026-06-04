import esCommon from '../src/locales/es/common.json';
import enCommon from '../src/locales/en/common.json';

const flatKeys = (obj: Record<string, unknown>, prefix = ''): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flatKeys(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
};

const esMap = flatKeys(esCommon as Record<string, unknown>);
const enMap = flatKeys(enCommon as Record<string, unknown>);

let _currentLng = 'es';

export function setTestLanguage(lng: string) {
  _currentLng = lng;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('i18nextLng', lng);
  }
}

export function getTestLanguage() {
  return _currentLng;
}

export function t(key: string): string {
  const map = _currentLng === 'en' ? enMap : esMap;
  return map[key] || key;
}

export const testI18n = {
  get language() { return _currentLng; },
  get resolvedLanguage() { return _currentLng; },
  changeLanguage: (lng: string) => {
    setTestLanguage(lng);
  },
};
