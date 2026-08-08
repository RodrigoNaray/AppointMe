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
  getMonthAvailability,
  getFirstMonthAvailable
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

  it('returns current month when it has at least one available day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-15T08:00:00.000Z'));

    const month = await getFirstMonthAvailable(30, 3);

    expect(month).toBe('2030-01');
    expect(mockPrisma.availabilityBlock.findMany).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('skips a fully blocked current month and returns the next available one', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-15T08:00:00.000Z'));

    mockPrisma.availabilityBlock.findMany.mockImplementation(async (args: {
      where: {
        endTime: { gte: Date };
      };
    }) => {
      const monthStart = args.where.endTime.gte;
      const isJanuary2030 =
        monthStart.getUTCFullYear() === 2030 && monthStart.getUTCMonth() === 0;

      if (!isJanuary2030) {
        return [];
      }

      return [
        {
          startTime: new Date('2030-01-01T00:00:00.000Z'),
          endTime: new Date('2030-02-01T00:00:00.000Z')
        }
      ];
    });

    const month = await getFirstMonthAvailable(30, 3);

    expect(month).toBe('2030-02');
    expect(mockPrisma.availabilityBlock.findMany).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('returns null when all checked months are fully blocked', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-15T12:00:00.000Z'));

    mockPrisma.availabilityBlock.findMany.mockResolvedValue([
      {
        startTime: new Date('2000-01-01T00:00:00.000Z'),
        endTime: new Date('2100-01-01T00:00:00.000Z')
      }
    ]);

    const month = await getFirstMonthAvailable(30, 2);

    expect(month).toBeNull();
    expect(mockPrisma.availabilityBlock.findMany).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('returns null for non-positive input params', async () => {
    expect(await getFirstMonthAvailable(0, 12)).toBeNull();
    expect(await getFirstMonthAvailable(30, 0)).toBeNull();
    expect(mockPrisma.adminUser.findFirst).not.toHaveBeenCalled();
  });

  it('does not offer slots already in the past or within the advance notice', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-07T10:00:00.000Z'));

    const date = new Date('2030-01-07T00:00:00.000Z');
    const slots = await getAvailableSlots(date, 30);

    expect(slots).toEqual([]);

    vi.useRealTimers();
  });

  it('offers slots after the configured advance notice', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-07T10:00:00.000Z'));

    mockPrisma.adminUser.findFirst.mockResolvedValue({
      id: 'admin-1',
      schedule: fullSchedule,
      minBookingAdvanceMinutes: 30
    });

    const date = new Date('2030-01-07T00:00:00.000Z');
    const slots = await getAvailableSlots(date, 30);

    expect(slots).toContain('10:30');

    vi.useRealTimers();
  });

  it('returns no slots for a date that has already passed', async () => {
    const date = new Date('2020-01-07T00:00:00.000Z');

    const slots = await getAvailableSlots(date, 30);

    expect(slots).toEqual([]);
    expect(mockPrisma.booking.findMany).not.toHaveBeenCalled();
  });
});
