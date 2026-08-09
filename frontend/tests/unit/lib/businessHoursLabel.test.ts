import { describe, expect, it } from 'vitest';
import { formatOpenDaysSummary } from '@/lib/businessHoursLabel';
import type { BusinessHours } from '@/api/modules/settings';

const day = (isOpen: boolean, openTime: string, closeTime: string) => ({ isOpen, openTime, closeTime });

const weekdays = (open = '09:00', close = '17:00'): BusinessHours => ({
  monday: day(true, open, close),
  tuesday: day(true, open, close),
  wednesday: day(true, open, close),
  thursday: day(true, open, close),
  friday: day(true, open, close),
  saturday: day(false, '00:00', '00:00'),
  sunday: day(false, '00:00', '00:00'),
});

const date = new Date(2026, 7, 10, 12);
const weekendDate = new Date(2026, 7, 15, 12);

describe('formatOpenDaysSummary', () => {
  it('returns null when schedule is undefined', () => {
    expect(formatOpenDaysSummary(undefined, date)).toBeNull();
  });

  it('returns null when no day is open', () => {
    const closed: BusinessHours = {
      monday: day(false, '00:00', '00:00'),
      tuesday: day(false, '00:00', '00:00'),
      wednesday: day(false, '00:00', '00:00'),
      thursday: day(false, '00:00', '00:00'),
      friday: day(false, '00:00', '00:00'),
      saturday: day(false, '00:00', '00:00'),
      sunday: day(false, '00:00', '00:00'),
    };
    expect(formatOpenDaysSummary(closed, date)).toBeNull();
  });

  it('shows "Hoy" with converted local hours when the business is open today', () => {
    const schedule = weekdays('12:00', '21:00');
    expect(formatOpenDaysSummary(schedule, date)).toBe('Hoy · 09:00 - 18:00');
  });

  it('shows a consecutive range with shared hours in Spanish', () => {
    const schedule = weekdays('12:00', '21:00');
    expect(formatOpenDaysSummary(schedule, weekendDate)).toBe('Lun a Vie · 09:00 - 18:00');
  });

  it('lists days individually when hours vary', () => {
    const schedule: BusinessHours = {
      ...weekdays('12:00', '21:00'),
      wednesday: day(true, '12:00', '16:00'),
    };
    expect(formatOpenDaysSummary(schedule, weekendDate)).toBe('Lun 09:00-18:00 · Mar 09:00-18:00 · Mié 09:00-13:00 · Jue 09:00-18:00 · Vie 09:00-18:00');
  });

  it('handles cross-midnight schedules by converting the close time on the next day', () => {
    const schedule: BusinessHours = {
      ...weekdays('20:00', '02:00'),
      saturday: day(false, '00:00', '00:00'),
      sunday: day(false, '00:00', '00:00'),
    };
    expect(formatOpenDaysSummary(schedule, weekendDate)).toBe('Lun a Vie · 17:00 - 23:00');
  });
});
