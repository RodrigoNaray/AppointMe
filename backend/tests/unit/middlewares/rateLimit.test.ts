import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

const { mockLimit, mockRatelimitConstructor } = vi.hoisted(() => {
  const limitFn = vi.fn();
  const ratelimitConstructor: ReturnType<typeof vi.fn> & { slidingWindow: ReturnType<typeof vi.fn> } =
    vi.fn().mockImplementation(() => ({ limit: limitFn })) as ReturnType<typeof vi.fn> & {
      slidingWindow: ReturnType<typeof vi.fn>;
    };
  ratelimitConstructor.slidingWindow = vi.fn(() => 'sliding-window-limiter');
  return { mockLimit: limitFn, mockRatelimitConstructor: ratelimitConstructor };
});

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: mockRatelimitConstructor
}));

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn()
}));

import { rateLimit, __resetRateLimiterCache } from '../../../src/middlewares/rateLimit';

const buildRes = () => {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    status: vi.fn().mockReturnThis(),
    json: vi.fn()
  } as unknown as Response & { headers: Record<string, string> };
};

describe('middlewares.rateLimit', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimiterCache();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RATE_LIMIT_DISABLED;
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('passes through when UPSTASH env vars are not configured (fail-open)', async () => {
    const middleware = rateLimit('strict');
    const req = { ip: '1.2.3.4', method: 'POST', path: '/api/auth/client/login' } as Request;
    const res = buildRes();
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('passes through in development mode regardless of env vars', async () => {
    process.env.NODE_ENV = 'development';
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

    const middleware = rateLimit('strict');
    const req = { ip: '1.2.3.4', method: 'POST', path: '/api/auth/client/login' } as Request;
    const res = buildRes();
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('passes through when RATE_LIMIT_DISABLED=true (kill switch)', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
    process.env.RATE_LIMIT_DISABLED = 'true';

    const middleware = rateLimit('normal');
    const req = { ip: '1.2.3.4', method: 'POST', path: '/api/auth/client/login' } as Request;
    const res = buildRes();
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('enforces limit and returns 429 with Retry-After when quota exceeded', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

    mockLimit.mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60_000
    });

    const middleware = rateLimit('strict');
    const req = { ip: '1.2.3.4', method: 'POST', path: '/api/auth/client/login' } as Request;
    const res = buildRes();
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED'
      })
    );
    expect(res.headers['Retry-After']).toBeDefined();
    expect(res.headers['X-RateLimit-Limit']).toBe('5');
    expect(res.headers['X-RateLimit-Remaining']).toBe('0');
  });

  it('attaches X-RateLimit headers and calls next() when under quota', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

    mockLimit.mockResolvedValueOnce({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60_000
    });

    const middleware = rateLimit('normal');
    const req = { ip: '1.2.3.4', method: 'POST', path: '/api/auth/client/verify-email' } as Request;
    const res = buildRes();
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.headers['X-RateLimit-Limit']).toBe('20');
    expect(res.headers['X-RateLimit-Remaining']).toBe('19');
  });

  it('fails open (calls next) when Upstash throws an error', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

    mockLimit.mockRejectedValueOnce(new Error('Upstash is down'));

    const middleware = rateLimit('lax');
    const req = { ip: '1.2.3.4', method: 'POST', path: '/api/bookings/create' } as Request;
    const res = buildRes();
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
