import { beforeEach, describe, expect, it } from 'vitest';
import {
  selectCompletedAt,
  selectDismiss,
  selectDismissed,
  selectMarkCompleted,
  selectReset,
  useOnboardingStore,
} from '@/stores/onboardingStore';

describe('onboardingStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useOnboardingStore.setState({ dismissed: false, completedAt: null });
  });

  it('starts with dismissed=false and completedAt=null', () => {
    const state = useOnboardingStore.getState();
    expect(selectDismissed(state)).toBe(false);
    expect(selectCompletedAt(state)).toBeNull();
  });

  it('dismiss() sets dismissed=true', () => {
    selectDismiss(useOnboardingStore.getState())();
    expect(selectDismissed(useOnboardingStore.getState())).toBe(true);
  });

  it('markCompleted() clears dismissed and sets completedAt to a valid ISO string', () => {
    useOnboardingStore.setState({ dismissed: true });
    selectMarkCompleted(useOnboardingStore.getState())();
    const state = useOnboardingStore.getState();
    expect(selectDismissed(state)).toBe(false);
    expect(selectCompletedAt(state)).not.toBeNull();
    expect(() => new Date(selectCompletedAt(state) as string).toISOString()).not.toThrow();
  });

  it('reset() restores initial state', () => {
    useOnboardingStore.setState({ dismissed: true, completedAt: '2030-01-01T00:00:00.000Z' });
    selectReset(useOnboardingStore.getState())();
    const state = useOnboardingStore.getState();
    expect(selectDismissed(state)).toBe(false);
    expect(selectCompletedAt(state)).toBeNull();
  });
});
