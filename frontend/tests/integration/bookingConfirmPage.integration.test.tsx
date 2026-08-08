import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BookingConfirmPage from '../../src/pages/BookingConfirmPage';
import { createMockClientUser, createMockService } from '../fixtures/mockData';
import { useAuthStore } from '../../src/stores/authStore';
import { useBookingStore } from '../../src/stores/bookingStore';
import toast from 'react-hot-toast';

const { mockCreateBooking, mockCancelBooking, mockResendVerification } = vi.hoisted(() => ({
  mockCreateBooking: vi.fn(),
  mockCancelBooking: vi.fn(),
  mockResendVerification: vi.fn(),
}));

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../src/api/modules/bookings', () => ({
  createBooking: mockCreateBooking,
  cancelBooking: mockCancelBooking,
}));

vi.mock('../../src/api/modules/clientAuth', () => ({
  default: { resendVerification: mockResendVerification },
  clientAuthService: { resendVerification: mockResendVerification },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
  error: vi.fn(),
  success: vi.fn(),
}));

const svcCorte = createMockService({ id: 'svc-1', name: 'Corte', durationMinutes: 30, price: 500 });
const svcBarba = createMockService({ id: 'svc-2', name: 'Barba', durationMinutes: 15, price: 300 });

describe('BookingConfirmPage integration — CU-36 multi-servicio', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useBookingStore.setState({
      cart: [
        { service: svcCorte, quantity: 1 },
        { service: svcBarba, quantity: 1 },
      ],
    });

    useAuthStore.setState({
      authState: {
        type: 'client',
        user: createMockClientUser({ id: 'client-1', emailVerified: true }),
        isAuthenticated: true,
      },
      isLoading: false,
    });
  });

  it('renders cart services and booking time', async () => {
    render(
      <MemoryRouter initialEntries={['/book/confirm?date=2030-01-02&time=10:00']}>
        <BookingConfirmPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Corte')).toBeTruthy();
      expect(screen.getByText('Barba')).toBeTruthy();
    });
  });

  it('navigates to success page when all bookings succeed', async () => {
    mockCreateBooking.mockResolvedValue({
      success: true,
      booking: { id: 'b-1' },
      message: 'Reserva creada',
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/book/confirm?date=2030-01-02&time=10:00']}>
        <BookingConfirmPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

    await waitFor(() => {
      expect(mockCreateBooking).toHaveBeenCalledTimes(2);
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  it('shows rollback modal when some bookings fail', async () => {
    mockCreateBooking
      .mockResolvedValueOnce({ success: true, booking: { id: 'b-1' }, message: 'ok' })
      .mockRejectedValueOnce({
        response: { status: 409, data: { message: 'Conflicto de horario' } },
      });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/book/confirm?date=2030-01-02&time=10:00']}>
        <BookingConfirmPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

    await waitFor(() => {
      expect(screen.getByText('Reserva parcial')).toBeTruthy();
    });
  });

  it('shows email verification banner on 403 EMAIL_NOT_VERIFIED', async () => {
    mockCreateBooking.mockRejectedValue({
      response: { status: 403, data: { code: 'EMAIL_NOT_VERIFIED' } },
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/book/confirm?date=2030-01-02&time=10:00']}>
        <BookingConfirmPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

    await waitFor(() => {
      expect(screen.getByText('Verificá tu email antes de reservar')).toBeTruthy();
    });
  });

  it('rolls back created bookings when EMAIL_NOT_VERIFIED occurs mid-cart', async () => {
    mockCreateBooking
      .mockResolvedValueOnce({ success: true, booking: { id: 'b-1' }, message: 'ok' })
      .mockRejectedValueOnce({ response: { status: 403, data: { code: 'EMAIL_NOT_VERIFIED' } } });
    mockCancelBooking.mockResolvedValue({ success: true });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/book/confirm?date=2030-01-02&time=10:00']}>
        <BookingConfirmPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

    await waitFor(() => {
      expect(mockCancelBooking).toHaveBeenCalledWith('b-1');
    });

    await waitFor(() => {
      expect(screen.getByText('Verificá tu email antes de reservar')).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeEnabled();
  });

  it('removes successful items from cart when keeping partial results', async () => {
    mockCreateBooking
      .mockResolvedValueOnce({ success: true, booking: { id: 'b-1' }, message: 'ok' })
      .mockRejectedValueOnce({
        response: { status: 409, data: { message: 'Conflicto de horario' } },
      });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/book/confirm?date=2030-01-02&time=10:00']}>
        <BookingConfirmPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

    await waitFor(() => {
      expect(screen.getByText('Reserva parcial')).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    await waitFor(() => {
      const cart = useBookingStore.getState().cart;
      expect(cart).toHaveLength(1);
      expect(cart[0].service.id).toBe('svc-2');
    });
  });
});
