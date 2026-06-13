import { useTranslation } from 'react-i18next';

export default function LanguageSelector() {
  const { i18n } = useTranslation();

  const isEs = i18n.resolvedLanguage === 'es';

  const toggle = () => {
    i18n.changeLanguage(isEs ? 'en' : 'es');
  };

  return (
    <button
      onClick={toggle}
      className="text-sm px-2 py-1 rounded-md opacity-50 hover:opacity-100 hover:bg-muted transition-all"
      aria-label={isEs ? 'Switch to English' : 'Cambiar a Español'}
    >
      {isEs ? '🇪🇸' : '🇺🇸'}
    </button>
  );
}
