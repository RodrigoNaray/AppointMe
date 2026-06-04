import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const languages = [
  { value: 'es', labelKey: 'language.es' },
  { value: 'en', labelKey: 'language.en' },
] as const;

export default function LanguageSelector() {
  const { t, i18n } = useTranslation();

  const handleChange = (value: string) => {
    i18n.changeLanguage(value);
  };

  return (
    <Select value={i18n.resolvedLanguage} onValueChange={handleChange}>
      <SelectTrigger className="w-auto gap-1 border-0 bg-transparent px-2 shadow-none hover:bg-accent/50">
        <span className="text-sm">{i18n.resolvedLanguage === 'en' ? '🇺🇸' : '🇪🇸'}</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.value} value={lang.value}>
            <span className="mr-2">{lang.value === 'en' ? '🇺🇸' : '🇪🇸'}</span>
            {t(lang.labelKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
