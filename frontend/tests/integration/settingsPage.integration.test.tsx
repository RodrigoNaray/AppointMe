import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  default: {
    get: mockGet,
    put: vi.fn(),
  },
}));

import SettingsPage from '@/pages/admin/SettingsPage';

describe('SettingsPage integration', () => {
  it('renders the info box about forward-applying rules', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          minBookingAdvanceMinutes: 60,
          minCancellationNoticeMinutes: 120,
        },
      },
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Reglas de Reserva/i)).toBeTruthy();
    });

    expect(screen.getByText(/Aplica a futuro/i)).toBeTruthy();
    expect(
      screen.getByText(/Las reservas ya confirmadas no se verán afectadas/i)
    ).toBeTruthy();
  });
});
