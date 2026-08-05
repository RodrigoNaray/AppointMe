import { describe, expect, it } from 'vitest';
import { convertSlotLocalToUTC, convertSlotUTCToLocal, convertSlotsUTCToLocal } from '@/lib/timezoneSlots';

const pad = (n: number): string => String(n).padStart(2, '0');

describe('timezoneSlots', () => {
  it('converts local to UTC and back preserving the same slot', () => {
    const date = new Date('2030-01-10T00:00:00.000Z');
    const localSlot = '14:30';

    const utcSlot = convertSlotLocalToUTC(localSlot, date);
    const localRoundTrip = convertSlotUTCToLocal(utcSlot, date);

    expect(localRoundTrip).toBe(localSlot);
  });

  it('converts UTC to local and back preserving the same slot', () => {
    const date = new Date('2030-06-10T00:00:00.000Z');
    const utcSlot = '09:00';

    const localSlot = convertSlotUTCToLocal(utcSlot, date);
    const utcRoundTrip = convertSlotLocalToUTC(localSlot, date);

    expect(utcRoundTrip).toBe(utcSlot);
  });

  it('handles midnight round-trip correctly', () => {
    const date = new Date('2030-01-10T00:00:00.000Z');
    const localSlot = '00:00';

    const utcSlot = convertSlotLocalToUTC(localSlot, date);
    const localRoundTrip = convertSlotUTCToLocal(utcSlot, date);

    expect(localRoundTrip).toBe(localSlot);
  });

  it('returns HH:mm with zero-padded values', () => {
    const date = new Date('2030-01-10T00:00:00.000Z');
    const result = convertSlotUTCToLocal('01:05', date);

    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('keeps conversion stable across different dates', () => {
    const winterDate = new Date('2030-01-10T00:00:00.000Z');
    const summerDate = new Date('2030-07-10T00:00:00.000Z');

    const winterRoundTrip = convertSlotUTCToLocal(
      convertSlotLocalToUTC('08:45', winterDate),
      winterDate
    );
    const summerRoundTrip = convertSlotUTCToLocal(
      convertSlotLocalToUTC('08:45', summerDate),
      summerDate
    );

    expect(winterRoundTrip).toBe('08:45');
    expect(summerRoundTrip).toBe('08:45');
  });

  it('keeps non-wrapping slots on the same UTC day', () => {
    const date = new Date(2030, 0, 10, 12, 0, 0, 0);
    const slots = convertSlotsUTCToLocal(['20:00', '20:15', '23:45'], date);

    const expected = ['20:00', '20:15', '23:45'].map((slot) => {
      const [h, m] = slot.split(':').map(Number);
      const utcDate = new Date(Date.UTC(2030, 0, 10, h, m, 0, 0));
      return `${pad(utcDate.getHours())}:${pad(utcDate.getMinutes())}`;
    });

    expect(slots).toEqual(expected);
  });

  it('maps wrap slots that cross midnight UTC to the next UTC day', () => {
    const date = new Date(2030, 0, 10, 12, 0, 0, 0);
    const slots = convertSlotsUTCToLocal(['20:00', '23:45', '00:00', '01:45'], date);

    const expected = ['20:00', '23:45', '00:00', '01:45'].map((slot, index) => {
      const [h, m] = slot.split(':').map(Number);
      const utcDay = index >= 2 ? 11 : 10;
      const utcDate = new Date(Date.UTC(2030, 0, utcDay, h, m, 0, 0));
      return `${pad(utcDate.getHours())}:${pad(utcDate.getMinutes())}`;
    });

    expect(slots).toEqual(expected);
  });
});