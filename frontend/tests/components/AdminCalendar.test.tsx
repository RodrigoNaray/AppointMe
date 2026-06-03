import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  default: {
    get: mockGet,
  },
}));

import { AdminCalendar } from '@/pages/admin/availability/AdminCalendar';

const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'evt-1',
  title: 'Test Event',
  start: new Date(`${year}-${month}-15T10:00:00`),
  end: new Date(`${year}-${month}-15T11:00:00`),
  type: 'booking' as const,
  ...overrides,
});

describe('AdminCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: [] });
  });

  it('renders calendar with default month view', async () => {
    render(<AdminCalendar />);
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const monthName = monthNames[now.getMonth()];
    await waitFor(() => {
      expect(screen.getByText(new RegExp(monthName, 'i'))).toBeTruthy();
    });
  });

  it('calls onBlockClick when a block event card is clicked', async () => {
    const onBlockClick = vi.fn();
    mockGet.mockResolvedValue({
      data: [makeEvent({ id: 'block-1', title: 'Vacaciones', type: 'block' as const })],
    });
    render(<AdminCalendar onBlockClick={onBlockClick} />);
    const card = await screen.findByText('Vacaciones');
    await userEvent.click(card);
    expect(onBlockClick).toHaveBeenCalledWith('block-1');
  });

  it('calls onBookingClick when a booking event card is clicked', async () => {
    const onBookingClick = vi.fn();
    mockGet.mockResolvedValue({
      data: [makeEvent({ id: 'booking-1', title: 'Corte - Ana', type: 'booking' as const })],
    });
    render(<AdminCalendar onBookingClick={onBookingClick} />);
    const card = await screen.findByText('Corte - Ana');
    await userEvent.click(card);
    expect(onBookingClick).toHaveBeenCalled();
  });

  it('calls onBlockSlot when clicking a day cell in month view', async () => {
    const onBlockSlot = vi.fn();
    mockGet.mockResolvedValue({
      data: [makeEvent({
        title: 'Horario de Trabajo',
        type: 'working_hours' as const,
        start: new Date(`${year}-${month}-15T09:00:00`),
        end: new Date(`${year}-${month}-15T18:00:00`),
      })],
    });
    render(<AdminCalendar onBlockSlot={onBlockSlot} />);
    const dayCells = await screen.findAllByText('15');
    const dayCell = dayCells.find((el) => el.closest('[class*="border"]'));
    if (dayCell) {
      await userEvent.click(dayCell);
      await waitFor(() => {
        expect(onBlockSlot).toHaveBeenCalled();
      });
    }
  });
});
