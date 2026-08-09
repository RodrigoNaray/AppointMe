import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

vi.mock('@/api/modules/settings', () => ({
  getBusinessHours: () =>
    Promise.resolve({
      monday: { isOpen: true, openTime: '12:00', closeTime: '21:00' },
      tuesday: { isOpen: true, openTime: '12:00', closeTime: '21:00' },
      wednesday: { isOpen: true, openTime: '12:00', closeTime: '21:00' },
      thursday: { isOpen: true, openTime: '12:00', closeTime: '21:00' },
      friday: { isOpen: true, openTime: '12:00', closeTime: '21:00' },
      saturday: { isOpen: true, openTime: '13:00', closeTime: '17:00' },
      sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
    }),
  getContactInfo: () =>
    Promise.resolve({
      businessName: 'Studio Carlos Méndez',
      businessDescription: 'Barbería Profesional con más de 10 años de experiencia.',
      phone: '+598 2900 0000',
      email: 'info@example.com',
      address: 'Av. 18 de Julio 1234, Montevideo, Uruguay',
      latitude: -34.9011,
      longitude: -56.1645,
    }),
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

  it('renders the business identity from contact info', async () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Studio Carlos Méndez')).toBeTruthy();
    });

    expect(screen.getAllByText('Barbería Profesional con más de 10 años de experiencia.').length).toBeGreaterThan(0);
    expect(screen.getByText('SC')).toBeTruthy();
    expect(screen.getByText('Lun')).toBeTruthy();
    expect(screen.getByText('Vie')).toBeTruthy();
    expect(screen.getByText('Sáb')).toBeTruthy();
    expect(screen.getByText('Cerrado')).toBeTruthy();
    expect(screen.getAllByText(/\d{2}:\d{2}–\d{2}:\d{2}/).length).toBeGreaterThan(0);
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
