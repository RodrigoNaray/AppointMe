import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  default: {
    get: mockGet,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'onboarding.banner.title': 'Tu cuenta aún no está lista',
        'onboarding.banner.subtitle': 'Completá estos pasos.',
        'onboarding.check.schedule': 'Horario semanal configurado',
        'onboarding.check.category': 'Categoría creada',
        'onboarding.check.service': 'Servicio activo',
        'onboarding.cta.start': 'Iniciar configuración guiada',
        'onboarding.cta.dismiss': 'Omitir por ahora',
        'onboarding.cta.backToWizard': 'Volver al wizard',
      };
      return map[key] || key;
    },
    i18n: { language: 'es' },
  }),
}));

vi.mock('@/components/admin/OnboardingWizard', () => ({
  default: () => <div data-testid="onboarding-wizard" />,
}));

import OnboardingBanner from '@/components/admin/OnboardingBanner';
import { useOnboardingStore } from '@/stores/onboardingStore';

const renderBanner = () => render(<MemoryRouter><OnboardingBanner /></MemoryRouter>);

const setNeedsOnboarding = (schedule: unknown, categoriesLen: number, servicesLen: number) => {
  mockGet.mockImplementation((url: string) => {
    if (url.includes('schedule')) return Promise.resolve({ data: schedule });
    if (url.includes('categories/admin')) return Promise.resolve({ data: new Array(categoriesLen).fill({ id: 'x' }) });
    if (url.includes('services')) return Promise.resolve({ data: { services: new Array(servicesLen).fill({ id: 'x', isActive: true }) } });
    return Promise.reject(new Error(`unexpected ${url}`));
  });
};

describe('OnboardingBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useOnboardingStore.setState({ dismissed: false, completedAt: null });
  });

  it('renders the banner with checklist when admin is not yet configured', async () => {
    setNeedsOnboarding({}, 0, 0);

    renderBanner();

    await waitFor(() => {
      expect(screen.getByText('Tu cuenta aún no está lista')).toBeInTheDocument();
    });
    expect(screen.getByText('Horario semanal configurado')).toBeInTheDocument();
    expect(screen.getByText('Categoría creada')).toBeInTheDocument();
    expect(screen.getByText('Servicio activo')).toBeInTheDocument();
    expect(screen.getByText('Iniciar configuración guiada')).toBeInTheDocument();
  });

  it('does not render when admin is fully configured', async () => {
    setNeedsOnboarding(
      { monday: { start: '12:00', end: '15:00', isActive: true } },
      1,
      1
    );

    renderBanner();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });
    expect(screen.queryByText('Tu cuenta aún no está lista')).not.toBeInTheDocument();
  });

  it('renders the slim back-to-wizard link when dismissed instead of the full banner', async () => {
    setNeedsOnboarding({}, 0, 0);
    useOnboardingStore.setState({ dismissed: true });

    renderBanner();

    await waitFor(() => {
      expect(screen.getByText('Volver al wizard', { exact: false })).toBeInTheDocument();
    });
    expect(screen.queryByText('Tu cuenta aún no está lista')).not.toBeInTheDocument();
    expect(screen.queryByText('Omitir por ahora')).not.toBeInTheDocument();
  });
});
