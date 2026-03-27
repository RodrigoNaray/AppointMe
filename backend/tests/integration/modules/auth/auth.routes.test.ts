import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

type AdminAuthRequest = Request & {
  user?: { id: string; email: string };
};

vi.mock('../../../../src/config/auth.config', () => ({
  cookieOptions: { httpOnly: true, sameSite: 'lax', secure: false },
  clearCookieOptions: { httpOnly: true, sameSite: 'lax', secure: false },
  ACCESS_ADMIN_TOKEN_COOKIE_NAME: 'adminToken',
  ACCESS_CLIENT_TOKEN_COOKIE_NAME: 'clientToken'
}));

vi.mock('../../../../src/middlewares/isAdminAuthenticated', () => ({
  isAdminAuthenticated: (req: Request, _res: Response, next: NextFunction) => {
    (req as AdminAuthRequest).user = { id: 'admin-1', email: 'admin@example.com' };
    next();
  }
}));

vi.mock('../../../../src/modules/auth/auth.services', () => ({
  validateUser: vi.fn(),
  generateToken: vi.fn()
}));

import router from '../../../../src/modules/auth/auth.routes';
import * as authServices from '../../../../src/modules/auth/auth.services';
import { createTestApp } from '../../../fixtures/testHelpers';

const mockedServices = vi.mocked(authServices);
type ValidatedAdmin = NonNullable<Awaited<ReturnType<typeof authServices.validateUser>>>;

describe('auth.routes', () => {
  const app = createTestApp('/auth', router);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 on invalid login credentials', async () => {
    mockedServices.validateUser.mockResolvedValue(null);

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Credenciales');
  });

  it('returns 200 and sets admin cookie on successful login', async () => {
    mockedServices.validateUser.mockResolvedValue(
      { id: 'admin-1', email: 'admin@example.com' } as unknown as ValidatedAdmin
    );
    mockedServices.generateToken.mockReturnValue('signed-token');

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'secret123' });

    expect(response.status).toBe(200);
    const setCookieHeader = String(response.headers['set-cookie']);
    expect(setCookieHeader).toContain('adminToken=');
  });

  it('returns 200 on logout', async () => {
    const response = await request(app).post('/auth/logout');

    expect(response.status).toBe(200);
  });

  it('returns authenticated profile', async () => {
    const response = await request(app).get('/auth/profile');

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe('admin-1');
  });
});
