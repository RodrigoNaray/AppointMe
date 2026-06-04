import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface OnboardingState {
  dismissed: boolean;
  completedAt: string | null;
  dismiss: () => void;
  markCompleted: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      dismissed: false,
      completedAt: null,
      dismiss: () => set({ dismissed: true }),
      markCompleted: () => set({ dismissed: false, completedAt: new Date().toISOString() }),
      reset: () => set({ dismissed: false, completedAt: null }),
    }),
    {
      name: 'appointmepro-onboarding',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        dismissed: state.dismissed,
        completedAt: state.completedAt,
      }),
    }
  )
);

export const selectDismissed = (state: OnboardingState) => state.dismissed;
export const selectCompletedAt = (state: OnboardingState) => state.completedAt;
export const selectDismiss = (state: OnboardingState) => state.dismiss;
export const selectMarkCompleted = (state: OnboardingState) => state.markCompleted;
export const selectReset = (state: OnboardingState) => state.reset;
