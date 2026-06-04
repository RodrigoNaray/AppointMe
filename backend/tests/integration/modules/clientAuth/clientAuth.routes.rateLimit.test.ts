import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

type ClientAuthRequest = Request & {
  user?: { id: string; email: string; name: string };
};

const { mockLimit, mockRatelimitConstructor } = vi.hoisted(() => {
  const limitFn = vi.fn();
  const ctor = Object.assign(
    vi.fn().mockImplementation(() => ({ limit: limitFn })),
    { slidingWindow: vi.fn(() => 'sliding-window-limiter' as const) }
  );
  return { mockLimit: limitFn, mockRatelimitConstructor: ctor };
});

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: mockRatelimitConstructor,
}));

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(),
}));

vi.mock('../../../../src/config/auth.config', () => ({
  ACCESS_CLIENT_TOKEN_COOKIE_NAME: 'clientToken',
  ACCESS_ADMIN_TOKEN_COOKIE_NAME: 'adminToken',
  cookieOptions: { httpOnly: true, sameSite: 'lax', secure: false },
  clearCookieOptions: { httpOnly: true, sameSite: 'lax', secure: false },
}));

vi.mock('../../../../src/middlewares/isClientAuthenticated', () => ({
  isClientAuthenticated: (req: Request, _res: Response, next: NextFunction) => {
    (req as ClientAuthRequest).user = { id: 'client-1', email: 'ana@example.com', name: 'Ana' };
    next();
  },
}));

vi.mock('../../../../src/modules/clientAuth/clientAuth.services', () => ({
  registerClient: vi.fn(),
  validateClient: vi.fn(),
  generateClientToken: vi.fn(),
  getClientProfile: vi.fn(),
  verifyClientEmail: vi.fn(),
  resendVerificationEmail: vi.fn(),
  requestEmailChange: vi.fn(),
  verifyEmailChange: vi.fn(),
  changePassword: vi.fn(),
  updateClientProfile: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

import router from '../../../../src/modules/clientAuth/clientAuth.routes';
import { createTestApp } from '../../../fixtures/testHelpers';

describe('clientAuth routes rate limit', () => {
  const app = createTestApp('/auth/client', router);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
    process.env.NODE_ENV = 'production';
  });

  it('returns 429 on POST /auth/client/resend-verification when rate limit exceeded', async () => {
    mockLimit.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const response = await request(app)
      .post('/auth/client/resend-verification')
      .send({});

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
    });
    expect(response.headers['retry-after']).toBeDefined();
    expect(response.headers['x-ratelimit-limit']).toBe('5');
    expect(response.headers['x-ratelimit-remaining']).toBe('0');
  });

  it('returns 429 on GET /auth/client/google when rate limit exceeded', async () => {
    mockLimit.mockResolvedValue({
      success: false,
      limit: 20,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const response = await request(app).get('/auth/client/google');

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
    });
    expect(response.headers['x-ratelimit-limit']).toBe('20');
  });
});
