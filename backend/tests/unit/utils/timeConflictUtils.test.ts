import { describe, expect, it } from 'vitest';
import {
  hasTimeConflictOptimized,
  hasTimeConflictSimple,
  TimePeriod
} from '../../../src/utils/timeConflictUtils';

describe('timeConflictUtils', () => {
  it('detects overlap on optimized search', () => {
    const busyPeriods: TimePeriod[] = [
      {
        start: new Date('2030-01-01T10:00:00.000Z'),
        end: new Date('2030-01-01T11:00:00.000Z')
      }
    ];

    const hasConflict = hasTimeConflictOptimized(
      new Date('2030-01-01T10:30:00.000Z'),
      new Date('2030-01-01T11:15:00.000Z'),
      busyPeriods
    );

    expect(hasConflict).toBe(true);
  });

  it('does not flag adjacent periods as conflict', () => {
    const busyPeriods: TimePeriod[] = [
      {
        start: new Date('2030-01-01T10:00:00.000Z'),
        end: new Date('2030-01-01T11:00:00.000Z')
      }
    ];

    const hasConflict = hasTimeConflictOptimized(
      new Date('2030-01-01T11:00:00.000Z'),
      new Date('2030-01-01T11:30:00.000Z'),
      busyPeriods
    );

    expect(hasConflict).toBe(false);
  });

  it('detects conflict when busy periods overlap each other', () => {
    const busyPeriods: TimePeriod[] = [
      {
        start: new Date('2030-01-01T09:00:00.000Z'),
        end: new Date('2030-01-01T12:00:00.000Z')
      },
      {
        start: new Date('2030-01-01T09:30:00.000Z'),
        end: new Date('2030-01-01T09:45:00.000Z')
      }
    ];

    const hasConflict = hasTimeConflictOptimized(
      new Date('2030-01-01T10:00:00.000Z'),
      new Date('2030-01-01T10:30:00.000Z'),
      busyPeriods
    );

    expect(hasConflict).toBe(true);
  });

  it('matches simple detection across overlapping busy periods', () => {
    const busyPeriods: TimePeriod[] = [
      { start: new Date('2030-01-01T08:00:00.000Z'), end: new Date('2030-01-01T11:00:00.000Z') },
      { start: new Date('2030-01-01T09:00:00.000Z'), end: new Date('2030-01-01T10:00:00.000Z') },
      { start: new Date('2030-01-01T14:00:00.000Z'), end: new Date('2030-01-01T15:00:00.000Z') }
    ];

    const candidates: TimePeriod[] = [
      { start: new Date('2030-01-01T10:30:00.000Z'), end: new Date('2030-01-01T11:00:00.000Z') },
      { start: new Date('2030-01-01T11:00:00.000Z'), end: new Date('2030-01-01T11:30:00.000Z') },
      { start: new Date('2030-01-01T13:30:00.000Z'), end: new Date('2030-01-01T14:00:00.000Z') },
      { start: new Date('2030-01-01T15:00:00.000Z'), end: new Date('2030-01-01T15:30:00.000Z') }
    ];

    candidates.forEach(slot => {
      const optimized = hasTimeConflictOptimized(slot.start, slot.end, busyPeriods);
      const simple = busyPeriods.some(
        (p) => slot.start < p.end && slot.end > p.start
      );
      expect(optimized).toBe(simple);
    });
  });
});
