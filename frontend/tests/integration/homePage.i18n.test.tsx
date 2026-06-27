import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { t, testI18n, setTestLanguage } from '../i18n-test-utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t,
    i18n: testI18n,
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty' as const, init: vi.fn() },
}));

vi.mock('@/api/modules/settings', () => ({
  getBusinessHours: () => Promise.resolve(undefined),
  getContactInfo: () => Promise.resolve(undefined),
}));

vi.mock('@/lib/geocoding', () => ({
  geocodeAddress: () => Promise.resolve(null),
}));

import HomePage from '@/pages/HomePage';

describe('HomePage i18n', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    setTestLanguage('es');
  });

  it('renders Spanish text', async () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Studio Carlos Méndez')).toBeTruthy();
    });

    expect(screen.getByText('Barbería Profesional')).toBeTruthy();
    expect(screen.getByText('Reservar Ahora')).toBeTruthy();
  });

  it('renders English text when language is set to English', async () => {
    setTestLanguage('en');

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Studio Carlos Méndez')).toBeTruthy();
    });

    expect(screen.getByText('Professional Barber Shop')).toBeTruthy();
    expect(screen.getByText('Book Now')).toBeTruthy();
  });
});
