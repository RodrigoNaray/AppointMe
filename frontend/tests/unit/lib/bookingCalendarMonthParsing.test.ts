import { describe, expect, it } from 'vitest';
import { parseFirstAvailableMonth } from '../../../src/pages/BookingCalendarPage';

describe('parseFirstAvailableMonth', () => {
  it('parses valid YYYY-MM values into local month-start dates', () => {
    const parsed = parseFirstAvailableMonth('2030-02');

    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2030);
    expect(parsed?.getMonth()).toBe(1);
    expect(parsed?.getDate()).toBe(1);
  });

  it('returns null for invalid month format', () => {
    expect(parseFirstAvailableMonth('02-2030')).toBeNull();
    expect(parseFirstAvailableMonth('2030/02')).toBeNull();
  });

  it('returns null for out-of-range month numbers', () => {
    expect(parseFirstAvailableMonth('2030-00')).toBeNull();
    expect(parseFirstAvailableMonth('2030-13')).toBeNull();
  });
});
