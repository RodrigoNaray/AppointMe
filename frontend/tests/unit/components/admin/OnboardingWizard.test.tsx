import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'onboarding.wizard.title': 'Configuración inicial',
        'onboarding.wizard.welcome.title': 'Bienvenido a AppointMePro',
        'onboarding.wizard.welcome.body': 'Vamos a configurar tu cuenta en 5 pasos.',
        'onboarding.cta.start': 'Iniciar configuración guiada',
      };
      return map[key] || key;
    },
    i18n: { language: 'es' },
  }),
}));

import OnboardingWizard from '@/components/admin/OnboardingWizard';

const renderWithRouter = (ui: React.ReactNode) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('OnboardingWizard', () => {
  it('renders the welcome step on open', () => {
    renderWithRouter(
      <OnboardingWizard open onOpenChange={() => {}} onStepFinished={() => {}} />
    );

    expect(screen.getByTestId('onboarding-wizard')).toBeInTheDocument();
    expect(screen.getByText('Bienvenido a AppointMePro')).toBeInTheDocument();
  });

  it('renders progress bar with 0% width on welcome step', () => {
    renderWithRouter(
      <OnboardingWizard open onOpenChange={() => {}} onStepFinished={() => {}} />
    );

    const bar = screen.getByTestId('onboarding-progress');
    expect(bar).toHaveStyle({ width: '0%' });
  });

  it('does not render content when closed', () => {
    renderWithRouter(
      <OnboardingWizard open={false} onOpenChange={() => {}} onStepFinished={() => {}} />
    );

    expect(screen.queryByTestId('onboarding-wizard')).not.toBeInTheDocument();
  });
});
