import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

type ClientAuthRequest = Request & {
  user?: { id: string; email: string; name: string };
};

vi.mock('../../../../src/config/auth.config', () => ({
  ACCESS_CLIENT_TOKEN_COOKIE_NAME: 'clientToken',
  ACCESS_ADMIN_TOKEN_COOKIE_NAME: 'adminToken',
  cookieOptions: { httpOnly: true, sameSite: 'lax', secure: false },
  clearCookieOptions: { httpOnly: true, sameSite: 'lax', secure: false }
}));

vi.mock('../../../../src/middlewares/isClientAuthenticated', () => ({
  isClientAuthenticated: (req: Request, _res: Response, next: NextFunction) => {
    (req as ClientAuthRequest).user = { id: 'client-1', email: 'ana@example.com', name: 'Ana' };
    next();
  }
}));

vi.mock('passport', () => ({
  default: {
    authenticate: vi.fn(() => (_req: Request, res: Response, next: NextFunction) => {
      if (typeof next === 'function') {
        return next();
      }
      return res.status(302).end();
    })
  }
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
  resetPassword: vi.fn()
}));

import router from '../../../../src/modules/clientAuth/clientAuth.routes';
import * as clientAuthService from '../../../../src/modules/clientAuth/clientAuth.services';
import { createTestApp } from '../../../fixtures/testHelpers';

const mockedService = vi.mocked(clientAuthService);
type RegisteredClient = Awaited<ReturnType<typeof clientAuthService.registerClient>>;
type ValidatedClient = Awaited<ReturnType<typeof clientAuthService.validateClient>>;
type ClientProfile = Awaited<ReturnType<typeof clientAuthService.getClientProfile>>;

describe('clientAuth.routes', () => {
  const app = createTestApp('/auth/client', router);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a new client in POST /auth/client/register', async () => {
    mockedService.registerClient.mockResolvedValue(
      { id: 'client-1', email: 'ana@example.com' } as unknown as RegisteredClient
    );

    const response = await request(app)
      .post('/auth/client/register')
      .send({ email: 'ana@example.com', name: 'Ana', phone: '099123456', password: 'secret123' });

    expect(response.status).toBe(201);
    expect(response.body.client.id).toBe('client-1');
  });

  it('returns 401 when login credentials are invalid', async () => {
    mockedService.validateClient.mockResolvedValue(null);

    const response = await request(app)
      .post('/auth/client/login')
      .send({ email: 'ana@example.com', password: 'wrong' });

    expect(response.status).toBe(401);
  });

  it('returns 200 on successful login and sets cookie', async () => {
    mockedService.validateClient.mockResolvedValue(
      { id: 'client-1', email: 'ana@example.com', name: 'Ana' } as unknown as ValidatedClient
    );
    mockedService.generateClientToken.mockReturnValue('client-jwt');

    const response = await request(app)
      .post('/auth/client/login')
      .send({ email: 'ana@example.com', password: 'secret123' });

    expect(response.status).toBe(200);
    const setCookieHeader = String(response.headers['set-cookie']);
    expect(setCookieHeader).toContain('clientToken=');
  });

  it('returns authenticated profile on GET /auth/client/profile', async () => {
    mockedService.getClientProfile.mockResolvedValue(
      {
        id: 'client-1',
        email: 'ana@example.com',
        name: 'Ana',
        phone: '099123456',
        googleId: null
      } as unknown as ClientProfile
    );

    const response = await request(app).get('/auth/client/profile');

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe('client-1');
  });

  it('returns generic success response for forgot-password', async () => {
    mockedService.requestPasswordReset.mockResolvedValue(true);

    const response = await request(app)
      .post('/auth/client/forgot-password')
      .send({ email: 'ana@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Si el email existe');
  });

  it('returns 200 when reset-password succeeds', async () => {
    mockedService.resetPassword.mockResolvedValue(undefined);

    const response = await request(app)
      .post('/auth/client/reset-password')
      .send({ token: 'valid-token', newPassword: 'new-secret123' });

    expect(response.status).toBe(200);
  });
});
