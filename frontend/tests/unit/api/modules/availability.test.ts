import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  default: {
    get: mockGet,
  },
}));

import { availabilityService } from '@/api/modules/availability';

describe('availabilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests month availability with valid params', async () => {
    mockGet.mockResolvedValue({ data: ['2030-01-10', '2030-01-11'] });

    const data = await availabilityService.getAvailabilityPerMonth({
      month: '2030-01',
      totalDuration: 60,
    });

    expect(data).toEqual(['2030-01-10', '2030-01-11']);
    expect(mockGet).toHaveBeenCalledWith('/availability/month', {
      params: { month: '2030-01', totalDuration: 60 },
    });
  });

  it('throws on invalid month format', async () => {
    await expect(
      availabilityService.getAvailabilityPerMonth({
        month: '01-2030',
        totalDuration: 60,
      })
    ).rejects.toThrow('month debe tener formato YYYY-MM');

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('throws on non-positive totalDuration', async () => {
    await expect(
      availabilityService.getAvailabilityPerMonth({
        month: '2030-01',
        totalDuration: 0,
      })
    ).rejects.toThrow('totalDuration debe ser un entero mayor a 0');

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('requests available slots with valid params', async () => {
    mockGet.mockResolvedValue({ data: ['09:00', '09:30'] });

    const data = await availabilityService.getAvailableSlots({
      date: '2030-01-10',
      durationMinutes: 30,
    });

    expect(data).toEqual(['09:00', '09:30']);
    expect(mockGet).toHaveBeenCalledWith('/availability', {
      params: { date: '2030-01-10', durationMinutes: 30 },
    });
  });

  it('throws on invalid date format', async () => {
    await expect(
      availabilityService.getAvailableSlots({
        date: '2030/01/10',
        durationMinutes: 30,
      })
    ).rejects.toThrow('date debe tener formato YYYY-MM-DD');

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('throws on invalid durationMinutes', async () => {
    await expect(
      availabilityService.getAvailableSlots({
        date: '2030-01-10',
        durationMinutes: -10,
      })
    ).rejects.toThrow('durationMinutes debe ser un entero mayor a 0');

    expect(mockGet).not.toHaveBeenCalled();
  });
});