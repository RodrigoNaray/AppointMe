import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    adminUser: {
      findFirst: vi.fn()
    },
    booking: {
      findMany: vi.fn()
    },
    availabilityBlock: {
      findMany: vi.fn()
    }
  }
}));

vi.mock('../../../../../src/config/prisma', () => ({
  default: mockPrisma
}));

import {
  getAvailableSlots,
  getMonthAvailability
} from '../../../../../src/modules/availability/public/availability.public.services';

const fullSchedule = {
  sunday: { isActive: true, start: '09:00', end: '11:00' },
  monday: { isActive: true, start: '09:00', end: '11:00' },
  tuesday: { isActive: true, start: '09:00', end: '11:00' },
  wednesday: { isActive: true, start: '09:00', end: '11:00' },
  thursday: { isActive: true, start: '09:00', end: '11:00' },
  friday: { isActive: true, start: '09:00', end: '11:00' },
  saturday: { isActive: true, start: '09:00', end: '11:00' }
};

describe('availability.public.services', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.adminUser.findFirst.mockResolvedValue({
      id: 'admin-1',
      schedule: fullSchedule
    });
    mockPrisma.booking.findMany.mockResolvedValue([]);
    mockPrisma.availabilityBlock.findMany.mockResolvedValue([]);
  });

  it('queries confirmed bookings scoped to admin for day slots', async () => {
    const date = new Date('2030-01-07T00:00:00.000Z');

    await getAvailableSlots(date, 30);

    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          adminId: 'admin-1',
          status: 'CONFIRMED'
        })
      })
    );
  });

  it('uses booking duration snapshot for conflict detection', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([
      {
        bookingTime: new Date('2030-01-07T09:00:00.000Z'),
        durationMinutes: 60
      }
    ]);

    const date = new Date('2030-01-07T00:00:00.000Z');
    const slots = await getAvailableSlots(date, 30);

    expect(slots).not.toContain('09:00');
    expect(slots).toContain('10:00');
  });

  it('returns month availability and uses CONFIRMED status filter', async () => {
    const month = new Date('2099-05-01T00:00:00.000Z');

    const availableDays = await getMonthAvailability(month, 30);

    expect(availableDays.length).toBeGreaterThan(0);
    expect(availableDays[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          adminId: 'admin-1',
          status: 'CONFIRMED'
        })
      })
    );
  });
});
