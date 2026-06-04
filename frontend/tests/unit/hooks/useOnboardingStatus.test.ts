import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  default: {
    get: mockGet,
  },
}));

import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import type { WeeklySchedule } from '@/types/availability';

const activeSchedule: WeeklySchedule = {
  monday: { start: '12:00', end: '15:00', isActive: true },
};

const emptySchedule: WeeklySchedule = {};

const makeCategory = (id: string) => ({
  id,
  name: `Cat ${id}`,
  description: null,
  isActive: true,
  createdAt: '2030-01-01T00:00:00.000Z',
  updatedAt: '2030-01-01T00:00:00.000Z',
});

const makeService = (id: string) => ({
  id,
  name: `Service ${id}`,
  description: null,
  durationMinutes: 30,
  price: 100,
  isActive: true,
  categoryId: 'cat-1',
  category: makeCategory('cat-1'),
  createdAt: '2030-01-01T00:00:00.000Z',
  updatedAt: '2030-01-01T00:00:00.000Z',
});

describe('useOnboardingStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns needsOnboarding=false when schedule, categories and services are present', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('schedule')) return Promise.resolve({ data: activeSchedule });
      if (url.includes('categories/admin')) return Promise.resolve({ data: [makeCategory('c1')] });
      if (url.includes('services')) return Promise.resolve({ data: [makeService('s1')] });
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    const { result } = renderHook(() => useOnboardingStatus());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasSchedule).toBe(true);
    expect(result.current.hasCategories).toBe(true);
    expect(result.current.hasServices).toBe(true);
    expect(result.current.needsOnboarding).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns needsOnboarding=true when all three items are empty', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('schedule')) return Promise.resolve({ data: emptySchedule });
      if (url.includes('categories/admin')) return Promise.resolve({ data: [] });
      if (url.includes('services')) return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    const { result } = renderHook(() => useOnboardingStatus());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasSchedule).toBe(false);
    expect(result.current.hasCategories).toBe(false);
    expect(result.current.hasServices).toBe(false);
    expect(result.current.needsOnboarding).toBe(true);
  });

  it('returns needsOnboarding=true when schedule exists but categories and services are empty', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('schedule')) return Promise.resolve({ data: activeSchedule });
      if (url.includes('categories/admin')) return Promise.resolve({ data: [] });
      if (url.includes('services')) return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    const { result } = renderHook(() => useOnboardingStatus());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasSchedule).toBe(true);
    expect(result.current.hasCategories).toBe(false);
    expect(result.current.hasServices).toBe(false);
    expect(result.current.needsOnboarding).toBe(true);
  });

  it('captures the error message when a request fails', async () => {
    mockGet.mockRejectedValue(new Error('Network down'));

    const { result } = renderHook(() => useOnboardingStatus());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Network down');
  });
});
