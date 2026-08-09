import { describe, expect, it } from 'vitest';
import { getWeekScheduleRows } from '@/lib/weekSchedule';
import type { BusinessHours } from '@/api/modules/settings';

const day = (isOpen: boolean, openTime: string, closeTime: string) => ({ isOpen, openTime, closeTime });

const weekdays = (open = '12:00', close = '21:00'): BusinessHours => ({
  monday: day(true, open, close),
  tuesday: day(true, open, close),
  wednesday: day(true, open, close),
  thursday: day(true, open, close),
  friday: day(true, open, close),
  saturday: day(true, '13:00', '17:00'),
  sunday: day(false, '00:00', '00:00'),
});

const date = new Date(2026, 7, 10, 12);

describe('getWeekScheduleRows', () => {
  it('returns 7 rows in Monday-to-Sunday order with Spanish labels', () => {
    const rows = getWeekScheduleRows(weekdays(), date);

    expect(rows).toHaveLength(7);
    expect(rows.map((r) => r.dayLabel)).toEqual([
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ]);
  });

  it('marks the current day as today', () => {
    const rows = getWeekScheduleRows(weekdays(), date);

    expect(rows.find((r) => r.isToday)?.dayLabel).toBe('Lunes');
  });

  it('includes Saturday and Sunday rows with open/closed state', () => {
    const rows = getWeekScheduleRows(weekdays(), date);

    const saturday = rows.find((r) => r.key === 'saturday');
    const sunday = rows.find((r) => r.key === 'sunday');

    expect(saturday?.isOpen).toBe(true);
    expect(sunday?.isOpen).toBe(false);
  });

  it('converts UTC hours to local timezone', () => {
    const rows = getWeekScheduleRows(weekdays(), date);
    const monday = rows.find((r) => r.key === 'monday');

    expect(monday?.open).toBe('09:00');
    expect(monday?.close).toBe('18:00');
  });

  it('handles cross-midnight windows by converting the close time on the next day', () => {
    const schedule: BusinessHours = {
      monday: day(true, '20:00', '02:00'),
      tuesday: day(false, '00:00', '00:00'),
      wednesday: day(false, '00:00', '00:00'),
      thursday: day(false, '00:00', '00:00'),
      friday: day(false, '00:00', '00:00'),
      saturday: day(false, '00:00', '00:00'),
      sunday: day(false, '00:00', '00:00'),
    };
    const rows = getWeekScheduleRows(schedule, date);
    const monday = rows.find((r) => r.key === 'monday');

    expect(monday?.open).toBe('17:00');
    expect(monday?.close).toBe('23:00');
  });

  it('returns all rows as closed when schedule is undefined', () => {
    const rows = getWeekScheduleRows(undefined, date);

    expect(rows.every((r) => !r.isOpen)).toBe(true);
  });
});
