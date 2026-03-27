import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientUser } from '@/types/auth';

const { mockPost, mockGet, mockInterceptorUse } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
  mockInterceptorUse: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  default: {
    post: mockPost,
    get: mockGet,
    interceptors: {
      response: {
        use: mockInterceptorUse,
      },
    },
  },
}));

import { clientAuthService } from '@/api/modules/clientAuth';

const makeClient = (): Omit<ClientUser, 'type'> => ({
  id: 'client-1',
  name: 'Ana',
  email: 'ana@example.com',
  phone: '099123456',
  googleId: null,
});

describe('clientAuthService', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
  });

  it('registers response interceptor on module init', () => {
    expect(mockInterceptorUse).toHaveBeenCalledTimes(1);
  });

  it('extracts error data from axios-like errors', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          message: 'Correo ya registrado',
          alreadyVerified: true,
        },
      },
    };

    expect(clientAuthService.getErrorData(error)).toEqual({
      message: 'Correo ya registrado',
      alreadyVerified: true,
    });
  });

  it('returns null for non-axios errors', () => {
    expect(clientAuthService.getErrorData(new Error('boom'))).toBeNull();
  });

  it('logs in and forces type client', async () => {
    mockPost.mockResolvedValue({
      data: {
        message: 'ok',
        client: makeClient(),
      },
    });

    const user = await clientAuthService.login({
      email: 'ana@example.com',
      password: 'secret123',
    });

    expect(user).toEqual({ ...makeClient(), type: 'client' });
    expect(mockPost).toHaveBeenCalledWith('/auth/client/login', {
      email: 'ana@example.com',
      password: 'secret123',
    });
  });

  it('returns success true on register success', async () => {
    mockPost.mockResolvedValue({
      data: {
        message: 'Registro exitoso',
        client: makeClient(),
      },
    });

    const result = await clientAuthService.register({
      name: 'Ana',
      email: 'ana@example.com',
      phone: '099123456',
      password: 'secret123',
    });

    expect(result).toEqual({
      success: true,
      message: 'Registro exitoso',
    });
  });

  it('returns backend message on register failure', async () => {
    mockPost.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Email ya existe',
        },
      },
    });

    const result = await clientAuthService.register({
      name: 'Ana',
      email: 'ana@example.com',
      phone: '099123456',
      password: 'secret123',
    });

    expect(result).toEqual({
      success: false,
      message: 'Email ya existe',
    });
  });

  it('treats already-verified verifyEmail errors as success', async () => {
    mockPost.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'Tu cuenta ya estaba verificada',
          alreadyVerified: true,
        },
      },
    });

    const result = await clientAuthService.verifyEmail('token-1');

    expect(result).toEqual({
      success: true,
      message: 'Tu cuenta ya estaba verificada',
      alreadyVerified: true,
    });
  });

  it('returns profile and forces type client', async () => {
    mockGet.mockResolvedValue({
      data: {
        user: makeClient(),
      },
    });

    const user = await clientAuthService.getProfile();

    expect(user).toEqual({ ...makeClient(), type: 'client' });
    expect(mockGet).toHaveBeenCalledWith('/auth/client/profile');
  });

  it('returns fallback error on changePassword failure without response message', async () => {
    mockPost.mockRejectedValue(new Error('network down'));

    const result = await clientAuthService.changePassword('old', 'new');

    expect(result).toEqual({
      success: false,
      message: 'Error al cambiar la contraseña',
    });
  });
});