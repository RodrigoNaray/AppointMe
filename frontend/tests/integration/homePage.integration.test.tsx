import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

vi.mock('@/api/modules/settings', () => ({
  getBusinessHours: () => Promise.resolve(undefined),
  getContactInfo: () => Promise.resolve(undefined),
}));

vi.mock('@/lib/geocoding', () => ({
  geocodeAddress: () => Promise.resolve(null),
}));

import HomePage from '@/pages/HomePage';

describe('HomePage', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it('renders the demo content in Spanish', async () => {
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
    expect(screen.getByText('Nuestros Servicios')).toBeTruthy();
    expect(screen.getByText('Ubicación')).toBeTruthy();
  });

  it('shows the empty services message when the catalog has no services', async () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No hay servicios disponibles aún.')).toBeTruthy();
    });
  });
});
