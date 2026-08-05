import { render, screen, waitFor } from '@testing-library/react';
import { addDays, addMonths, format } from 'date-fns';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BookingCalendarPage from '../../src/pages/BookingCalendarPage';
import { createMockService } from '../fixtures/mockData';
import { useAuthStore } from '../../src/stores/authStore';
import { useBookingStore } from '../../src/stores/bookingStore';

const {
  mockGetBookingRules,
  mockGetFirstMonthAvailable,
  mockGetAvailabilityPerMonth,
  mockGetAvailableSlots,
} = vi.hoisted(() => ({
  mockGetBookingRules: vi.fn(),
  mockGetFirstMonthAvailable: vi.fn(),
  mockGetAvailabilityPerMonth: vi.fn(),
  mockGetAvailableSlots: vi.fn(),
}));

vi.mock('../../src/api/modules/settings', () => ({
  getBookingRules: mockGetBookingRules,
}));

vi.mock('../../src/api/modules/availability', () => ({
  availabilityService: {
    getFirstMonthAvailable: mockGetFirstMonthAvailable,
    getAvailabilityPerMonth: mockGetAvailabilityPerMonth,
    getAvailableSlots: mockGetAvailableSlots,
  },
}));

vi.mock('../../src/components/ui/calendar', () => ({
  Calendar: ({ month }: { month?: Date }) => (
    <div data-testid="calendar-month">{month ? month.toISOString().slice(0, 10) : 'no-month'}</div>
  ),
}));

vi.mock('../../src/lib/timezoneSlots', () => ({
  convertSlotUTCToLocal: (value: string) => value,
  convertSlotLocalToUTC: (value: string) => value,
  convertSlotsUTCToLocal: (values: string[]) => values,
}));

describe('BookingCalendarPage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useBookingStore.setState({
      cart: [{ service: createMockService({ durationMinutes: 60 }), quantity: 1 }],
    });

    useAuthStore.setState({
      authState: { type: null, user: null, isAuthenticated: false },
      isLoading: false,
    });

    mockGetBookingRules.mockResolvedValue({
      minBookingAdvanceMinutes: 15,
      minCancellationNoticeMinutes: 60,
    });
    mockGetAvailabilityPerMonth.mockResolvedValue([]);
    mockGetAvailableSlots.mockResolvedValue([]);
  });

  it('renders without invalid hook call and initializes month from firstMonth endpoint', async () => {
    mockGetFirstMonthAvailable.mockResolvedValue({ month: '2030-04' });

    render(
      <MemoryRouter initialEntries={['/book/calendar']}>
        <BookingCalendarPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetFirstMonthAvailable).toHaveBeenCalledWith({
        totalDuration: 60,
        maxMonthsAhead: 12,
      });
    });

    await waitFor(() => {
      const label = screen.getByTestId('calendar-month');
      expect(label.textContent).toContain('2030-04-01');
    });
  });

  it('falls back to current month when firstMonth returns null', async () => {
    mockGetFirstMonthAvailable.mockResolvedValue({ month: null });

    render(
      <MemoryRouter initialEntries={['/book/calendar']}>
        <BookingCalendarPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetFirstMonthAvailable).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const label = screen.getByTestId('calendar-month');
      expect(label.textContent).not.toContain('no-month');
    });
  });

  it('auto-advances from today to the next available day when today has no valid slots', async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    mockGetFirstMonthAvailable.mockResolvedValue({ month: null });
    mockGetAvailabilityPerMonth.mockResolvedValue([today, tomorrow]);

    mockGetAvailableSlots.mockImplementation(async ({ date }: { date: string; durationMinutes: number }) => {
      if (date === today) {
        return ['00:00'];
      }

      if (date === tomorrow) {
        return ['09:00'];
      }

      return [];
    });

    render(
      <MemoryRouter initialEntries={['/book/calendar']}>
        <BookingCalendarPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetAvailableSlots).toHaveBeenCalled();
      const requestedDates = mockGetAvailableSlots.mock.calls.map((call) => call[0].date);
      expect(requestedDates).toContain(today);
      expect(requestedDates).toContain(tomorrow);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '09:00' })).toBeTruthy();
    });
  });

  it('allows returning to current month after navigating to next month', async () => {
    const user = userEvent.setup();
    const today = new Date();
    const currentMonth = format(today, 'yyyy-MM');
    const nextMonth = format(addMonths(today, 1), 'yyyy-MM');

    mockGetFirstMonthAvailable.mockResolvedValue({ month: nextMonth });
    mockGetAvailabilityPerMonth.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/book/calendar']}>
        <BookingCalendarPage />
      </MemoryRouter>
    );

    const prevMonthButton = await screen.findByRole('button', { name: 'Mes anterior' });

    await waitFor(() => {
      expect(prevMonthButton).toBeTruthy();
      expect((prevMonthButton as HTMLButtonElement).disabled).toBe(false);
    });

    await user.click(prevMonthButton);

    await waitFor(() => {
      const requestedMonths = mockGetAvailabilityPerMonth.mock.calls.map((call) => call[0].month);
      expect(requestedMonths).toContain(nextMonth);
      expect(requestedMonths).toContain(currentMonth);
    });
  });
});
