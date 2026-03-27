import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    adminUser: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    booking: {
      findMany: vi.fn()
    },
    availabilityBlock: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

vi.mock('../../../../../src/config/prisma', () => ({
  default: mockPrisma
}));

import {
  AvailabilityValidationError,
  updateSchedule,
  getBlocks,
  createBlock,
  deleteBlock,
  getCalendarEvents
} from '../../../../../src/modules/availability/admin/availability.admin.services';

describe('availability.admin.services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates schedule payload before update', async () => {
    await expect(
      updateSchedule('admin-1', {
        monday: { isActive: true, start: '10:00', end: '09:00' }
      } as unknown as Parameters<typeof updateSchedule>[1])
    ).rejects.toBeInstanceOf(AvailabilityValidationError);

    expect(mockPrisma.adminUser.update).not.toHaveBeenCalled();
  });

  it('filters blocks by admin id', async () => {
    mockPrisma.availabilityBlock.findMany.mockResolvedValue([]);

    await getBlocks('admin-1');

    expect(mockPrisma.availabilityBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { adminId: 'admin-1' }
      })
    );
  });

  it('rejects block creation when date range is invalid', async () => {
    await expect(
      createBlock({
        adminId: 'admin-1',
        startTime: new Date('2030-01-01T10:00:00.000Z'),
        endTime: new Date('2030-01-01T09:00:00.000Z')
      })
    ).rejects.toBeInstanceOf(AvailabilityValidationError);
  });

  it('throws not found style error when deleting unknown block', async () => {
    mockPrisma.availabilityBlock.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteBlock('block-1', 'admin-1')).rejects.toBeInstanceOf(AvailabilityValidationError);
  });

  it('builds booking events using booking duration snapshot', async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValue({
      schedule: {
        tuesday: { isActive: true, start: '09:00', end: '17:00' }
      }
    });
    mockPrisma.booking.findMany.mockResolvedValue([
      {
        bookingTime: new Date('2030-01-01T10:00:00.000Z'),
        durationMinutes: 45,
        service: { name: 'Corte' },
        client: { name: 'Ana' }
      }
    ]);
    mockPrisma.availabilityBlock.findMany.mockResolvedValue([]);

    const events = await getCalendarEvents('admin-1', new Date('2030-01-01T00:00:00.000Z'));

    const bookingEvent = events.find((event) => event.type === 'booking');

    expect(bookingEvent?.title).toContain('Corte');
    expect(bookingEvent?.end.toISOString()).toBe('2030-01-01T10:45:00.000Z');
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
