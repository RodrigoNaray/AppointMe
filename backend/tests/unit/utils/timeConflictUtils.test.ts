import { describe, expect, it } from 'vitest';
import {
  hasTimeConflictOptimized,
  hasTimeConflictSimple,
  filterAvailableSlots,
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

  it('filters only non-conflicting candidate slots', () => {
    const candidateSlots: TimePeriod[] = [
      {
        start: new Date('2030-01-01T09:00:00.000Z'),
        end: new Date('2030-01-01T09:30:00.000Z')
      },
      {
        start: new Date('2030-01-01T10:00:00.000Z'),
        end: new Date('2030-01-01T10:30:00.000Z')
      },
      {
        start: new Date('2030-01-01T11:30:00.000Z'),
        end: new Date('2030-01-01T12:00:00.000Z')
      }
    ];

    const busyPeriods: TimePeriod[] = [
      {
        start: new Date('2030-01-01T10:00:00.000Z'),
        end: new Date('2030-01-01T11:00:00.000Z')
      }
    ];

    const optimized = filterAvailableSlots(candidateSlots, busyPeriods);
    const simple = candidateSlots.filter(
      (slot) => !hasTimeConflictSimple(slot.start, slot.end, busyPeriods)
    );

    expect(optimized).toEqual(simple);
    expect(optimized).toHaveLength(2);
  });
});
