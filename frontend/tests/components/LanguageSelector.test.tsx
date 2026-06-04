import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t, testI18n } from '../i18n-test-utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t,
    i18n: testI18n,
  }),
  initReactI18next: { type: '3rdParty' as const, init: vi.fn() },
}));

import LanguageSelector from '@/components/LanguageSelector';

describe('LanguageSelector', () => {
  it('renders the current language trigger', () => {
    render(<LanguageSelector />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeTruthy();
  });
});
