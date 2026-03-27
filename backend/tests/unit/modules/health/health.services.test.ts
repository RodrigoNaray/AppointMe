import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn()
  }
}));

vi.mock('../../../../src/config/prisma', () => ({
  default: mockPrisma
}));

import { getStatus } from '../../../../src/modules/health/health.services';

describe('health.services', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns db status ok when query succeeds', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ ok: 1 }]);

    const result = await getStatus();

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(result.db.status).toBe('ok');
    expect(result.timestamp).toBe('2030-01-01T00:00:00.000Z');
    expect(typeof result.uptime).toBe('number');
  });

  it('returns db status error when query fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockPrisma.$queryRaw.mockRejectedValue(new Error('db down'));

    const result = await getStatus();

    expect(result.db.status).toBe('error');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
