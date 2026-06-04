import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/api/client';
import type { WeeklySchedule } from '@/types/availability';
import type { Category, Service } from '@/types/service';

export interface OnboardingStatus {
  hasSchedule: boolean;
  hasCategories: boolean;
  hasServices: boolean;
  needsOnboarding: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const INITIAL: Omit<OnboardingStatus, 'refetch'> = {
  hasSchedule: false,
  hasCategories: false,
  hasServices: false,
  needsOnboarding: true,
  isLoading: true,
  error: null,
};

const hasAnyActiveDay = (schedule: WeeklySchedule | null): boolean => {
  if (!schedule) return false;
  return Object.values(schedule).some(
    (day) => day && day.isActive && day.start && day.end
  );
};

export function useOnboardingStatus(): OnboardingStatus {
  const [state, setState] = useState<Omit<OnboardingStatus, 'refetch'>>(INITIAL);

  const fetchStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const [scheduleRes, categoriesRes, servicesRes] = await Promise.all([
        apiClient.get<WeeklySchedule>('/admin/availability/schedule'),
        apiClient.get<Category[]>('/categories/admin'),
        apiClient.get<Service[]>('/services'),
      ]);

      const hasSchedule = hasAnyActiveDay(scheduleRes.data);
      const hasCategories = categoriesRes.data.length > 0;
      const hasServices = servicesRes.data.length > 0;

      setState({
        hasSchedule,
        hasCategories,
        hasServices,
        needsOnboarding: !hasSchedule || !hasCategories || !hasServices,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return { ...state, refetch: fetchStatus };
}
