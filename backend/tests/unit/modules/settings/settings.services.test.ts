import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_WEEKLY_SCHEDULE } from '../../../fixtures/mockData';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    adminUser: {
      findFirst: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock('../../../../src/config/prisma', () => ({
  default: mockPrisma
}));

import {
  getBookingRules,
  getBusinessHours,
  updateBookingRules,
  getContactInfo,
  updateContactInfo
} from '../../../../src/modules/settings/settings.services';

describe('settings.services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns booking defaults when admin values are null', async () => {
    mockPrisma.adminUser.findFirst.mockResolvedValue({
      minBookingAdvanceMinutes: null,
      minCancellationNoticeMinutes: null
    });

    const data = await getBookingRules();

    expect(data).toEqual({
      minBookingAdvanceMinutes: 60,
      minCancellationNoticeMinutes: 120
    });
  });

  it('throws 404-style settings error when no admin config exists', async () => {
    mockPrisma.adminUser.findFirst.mockResolvedValue(null);

    await expect(getBookingRules()).rejects.toMatchObject({ statusCode: 404 });
  });

  it('maps business hours from persisted schedule', async () => {
    mockPrisma.adminUser.findFirst.mockResolvedValue({
      schedule: DEFAULT_WEEKLY_SCHEDULE
    });

    const data = await getBusinessHours();

    expect(data.monday).toEqual({ isOpen: true, openTime: '09:00', closeTime: '17:00' });
    expect(data.saturday).toEqual({ isOpen: false, openTime: '00:00', closeTime: '00:00' });
  });

  it('returns default business hours when schedule is null', async () => {
    mockPrisma.adminUser.findFirst.mockResolvedValue({ schedule: null });

    const data = await getBusinessHours();

    expect(data.monday.isOpen).toBe(true);
    expect(data.sunday.isOpen).toBe(false);
  });

  it('returns contact info with fallback values', async () => {
    mockPrisma.adminUser.findFirst.mockResolvedValue({
      businessPhone: null,
      businessEmail: null,
      businessAddress: null,
      businessLatitude: null,
      businessLongitude: null,
      email: 'admin@example.com'
    });

    const data = await getContactInfo();

    expect(data.phone).toBe('+598 XXX XXX XXX');
    expect(data.email).toBe('admin@example.com');
    expect(data.address).toBe('Dirección no disponible');
  });

  it('does not modify existing bookings when rules are updated', async () => {
    mockPrisma.adminUser.update.mockResolvedValue({
      minBookingAdvanceMinutes: 30,
      minCancellationNoticeMinutes: 60
    });

    await updateBookingRules('admin-1', {
      minBookingAdvanceMinutes: 30,
      minCancellationNoticeMinutes: 60
    });

    expect(mockPrisma.adminUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'admin-1' },
        data: {
          minBookingAdvanceMinutes: 30,
          minCancellationNoticeMinutes: 60
        }
      })
    );
    expect(mockPrisma.booking?.updateMany).toBeUndefined();
  });

  it('rejects updateBookingRules when values are negative', async () => {
    await expect(
      updateBookingRules('admin-1', { minBookingAdvanceMinutes: -1 })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockPrisma.adminUser.update).not.toHaveBeenCalled();
  });

  it('rejects updateContactInfo when latitude is invalid', async () => {
    await expect(
      updateContactInfo('admin-1', { businessLatitude: 190 })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects updateContactInfo when longitude is invalid', async () => {
    await expect(
      updateContactInfo('admin-1', { businessLongitude: 200 })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockPrisma.adminUser.update).not.toHaveBeenCalled();
  });

  it('rejects updateContactInfo when latitude is below -90', async () => {
    await expect(
      updateContactInfo('admin-1', { businessLatitude: -100 })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('sanitizes address and persists contact info', async () => {
    mockPrisma.adminUser.update.mockResolvedValue({
      businessPhone: '+59812345678',
      businessEmail: 'info@example.com',
      businessAddress: 'Av. Principal 123',
      businessLatitude: -34.9,
      businessLongitude: -56.2,
      email: 'admin@example.com'
    });

    const data = await updateContactInfo('admin-1', {
      businessPhone: '+598 123 456 78',
      businessEmail: 'info@example.com',
      businessAddress: '   Av. Principal 123   ',
      businessLatitude: -34.9,
      businessLongitude: -56.2
    });

    expect(mockPrisma.adminUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessAddress: 'Av. Principal 123'
        })
      })
    );

    expect(data.address).toBe('Av. Principal 123');
  });
});
