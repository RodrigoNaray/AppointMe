import { describe, expect, it } from 'vitest';
import {
  isBookingPast,
  deriveBookingDisplayStatus,
} from '@/lib/bookingStatus';

const NOW = new Date('2030-01-10T12:00:00.000Z');

describe('isBookingPast', () => {
  it('returns true when the booking time is before now', () => {
    expect(isBookingPast('2030-01-10T11:59:59.000Z', NOW)).toBe(true);
  });

  it('returns true when the booking time equals now', () => {
    expect(isBookingPast('2030-01-10T12:00:00.000Z', NOW)).toBe(true);
  });

  it('returns false when the booking time is in the future', () => {
    expect(isBookingPast('2030-01-10T12:00:01.000Z', NOW)).toBe(false);
  });

  it('returns false for an invalid date', () => {
    expect(isBookingPast('not-a-date', NOW)).toBe(false);
  });
});

describe('deriveBookingDisplayStatus', () => {
  it('maps CANCELLED to Cancelada regardless of time', () => {
    expect(
      deriveBookingDisplayStatus('CANCELLED', '2030-01-10T11:00:00.000Z', NOW)
    ).toBe('Cancelada');
    expect(
      deriveBookingDisplayStatus('CANCELLED', '2030-01-20T11:00:00.000Z', NOW)
    ).toBe('Cancelada');
  });

  it('maps CONFIRMED past bookings to Finalizada', () => {
    expect(
      deriveBookingDisplayStatus('CONFIRMED', '2030-01-10T11:00:00.000Z', NOW)
    ).toBe('Finalizada');
    expect(
      deriveBookingDisplayStatus('CONFIRMED', '2030-01-10T12:00:00.000Z', NOW)
    ).toBe('Finalizada');
  });

  it('maps CONFIRMED future bookings to Confirmada', () => {
    expect(
      deriveBookingDisplayStatus('CONFIRMED', '2030-01-10T12:00:01.000Z', NOW)
    ).toBe('Confirmada');
  });

  it('maps unknown statuses to Confirmada', () => {
    expect(
      deriveBookingDisplayStatus('PENDING', '2030-01-20T11:00:00.000Z', NOW)
    ).toBe('Confirmada');
  });
});
