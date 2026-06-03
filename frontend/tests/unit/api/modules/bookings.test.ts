import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPost, mockPut } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  default: {
    post: mockPost,
    put: mockPut,
  },
}));

import { createBooking, cancelBooking } from '@/api/modules/bookings';

describe('bookings API module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createBooking sends clientTimezone in payload', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, booking: { id: 'b-1' }, message: 'ok' },
    });

    const result = await createBooking({
      serviceId: 'svc-1',
      bookingTime: '2030-01-02T10:00:00.000Z',
      notes: '',
      clientTimezone: 'America/Argentina/Buenos_Aires',
    });

    expect(result.success).toBe(true);
    expect(mockPost).toHaveBeenCalledWith('/bookings/create', {
      serviceId: 'svc-1',
      bookingTime: '2030-01-02T10:00:00.000Z',
      notes: '',
      clientTimezone: 'America/Argentina/Buenos_Aires',
    });
  });

  it('cancelBooking calls PUT with booking id', async () => {
    mockPut.mockResolvedValue({
      data: { success: true, message: 'Reserva cancelada' },
    });

    const result = await cancelBooking('b-1');

    expect(result.success).toBe(true);
    expect(mockPut).toHaveBeenCalledWith('/bookings/b-1/cancel');
  });

  it('createBooking propagates errors from API', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'));

    await expect(
      createBooking({
        serviceId: 'svc-1',
        bookingTime: '2030-01-02T10:00:00.000Z',
        clientTimezone: 'UTC',
      })
    ).rejects.toThrow('Network Error');
  });
});
