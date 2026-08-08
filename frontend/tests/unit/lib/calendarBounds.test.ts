import { describe, expect, it } from 'vitest';
import { computeSlotBounds } from '@/lib/calendarBounds';
import type { WeeklySchedule } from '@/types/availability';

const day = (start: string, end: string, isActive = true) => ({ start, end, isActive });

describe('computeSlotBounds', () => {
  it('returns default bounds when schedule is undefined', () => {
    expect(computeSlotBounds(undefined)).toEqual({ min: '07:00:00', max: '22:00:00' });
  });

  it('returns default bounds when no day is active', () => {
    const schedule: WeeklySchedule = {
      monday: day('09:00', '17:00', false),
      tuesday: day('09:00', '17:00', false),
    };
    expect(computeSlotBounds(schedule)).toEqual({ min: '07:00:00', max: '22:00:00' });
  });

  it('computes padded bounds for a regular single-day schedule', () => {
    const schedule: WeeklySchedule = { monday: day('08:00', '17:00') };
    expect(computeSlotBounds(schedule)).toEqual({ min: '07:00:00', max: '18:00:00' });
  });

  it('uses the earliest start and latest end across days', () => {
    const schedule: WeeklySchedule = {
      monday: day('08:00', '12:00'),
      wednesday: day('14:00', '20:00'),
    };
    expect(computeSlotBounds(schedule)).toEqual({ min: '07:00:00', max: '21:00:00' });
  });

  it('never extends the grid past midnight for cross-midnight days', () => {
    const schedule: WeeklySchedule = {
      monday: day('20:00', '02:00'),
      wednesday: day('08:00', '17:00'),
    };
    const bounds = computeSlotBounds(schedule);
    expect(bounds.min).toBe('07:00:00');
    expect(bounds.max).toBe('24:00:00');
  });

  it('caps the max at 24:00 even for schedules ending exactly at midnight', () => {
    const schedule: WeeklySchedule = { monday: day('23:00', '24:00') };
    expect(computeSlotBounds(schedule)).toEqual({ min: '22:00:00', max: '24:00:00' });
  });

  it('clamps min at 00:00 when the schedule starts very early', () => {
    const schedule: WeeklySchedule = { monday: day('00:00', '08:00') };
    expect(computeSlotBounds(schedule)).toEqual({ min: '00:00:00', max: '09:00:00' });
  });
});
