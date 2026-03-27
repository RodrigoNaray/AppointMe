import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canCancelBooking, formatCancellationNotice } from '@/lib/bookingUtils';

describe('bookingUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows cancellation when remaining time is above threshold', () => {
    const result = canCancelBooking('2030-01-01T13:00:00.000Z', 120);

    expect(result.canCancel).toBe(true);
    expect(result.minutesRemaining).toBe(180);
    expect(result.hoursRemaining).toBe(3);
  });

  it('allows cancellation exactly at threshold', () => {
    const result = canCancelBooking('2030-01-01T12:00:00.000Z', 120);

    expect(result.canCancel).toBe(true);
    expect(result.minutesRemaining).toBe(120);
  });

  it('blocks cancellation below threshold', () => {
    const result = canCancelBooking('2030-01-01T11:59:00.000Z', 120);

    expect(result.canCancel).toBe(false);
    expect(result.minutesRemaining).toBe(119);
  });

  it('blocks cancellation for past bookings', () => {
    const result = canCancelBooking('2030-01-01T09:00:00.000Z', 30);

    expect(result.canCancel).toBe(false);
    expect(result.minutesRemaining).toBe(-60);
    expect(result.hoursRemaining).toBe(-1);
  });

  it('formats cancellation notice for minute-only values', () => {
    expect(formatCancellationNotice(1)).toBe('1 minuto');
    expect(formatCancellationNotice(30)).toBe('30 minutos');
  });

  it('formats cancellation notice for exact hours', () => {
    expect(formatCancellationNotice(60)).toBe('1 hora');
    expect(formatCancellationNotice(120)).toBe('2 horas');
  });

  it('formats cancellation notice for mixed hours and minutes', () => {
    expect(formatCancellationNotice(61)).toBe('1 hora y 1 minuto');
    expect(formatCancellationNotice(90)).toBe('1 hora y 30 minutos');
  });
});