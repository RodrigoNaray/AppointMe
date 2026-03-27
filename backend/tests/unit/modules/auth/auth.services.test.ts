import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../../../src/utils/error';

const { mockPrisma, mockBcrypt, mockJwt } = vi.hoisted(() => ({
  mockPrisma: {
    adminUser: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  },
  mockBcrypt: {
    hash: vi.fn(),
    compare: vi.fn()
  },
  mockJwt: {
    sign: vi.fn()
  }
}));

vi.mock('../../../../src/config/prisma', () => ({
  default: mockPrisma
}));

vi.mock('bcrypt', () => ({
  default: mockBcrypt
}));

vi.mock('jsonwebtoken', () => ({
  default: mockJwt
}));

vi.mock('../../../../src/config/auth.config', () => ({
  JWT_SECRET: 'test-secret',
  JWT_EXPIRATION: '8h'
}));

import {
  generateToken,
  registerUser,
  validateUser
} from '../../../../src/modules/auth/auth.services';

describe('auth.services', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  it('throws ConflictError when registering duplicated email', async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValue({ id: 'admin-1', email: 'admin@example.com' });

    await expect(
      registerUser({ email: 'admin@example.com', password: 'secret123' })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('registers user with hashed password and returns sanitized payload', async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValue(null);
    mockBcrypt.hash.mockResolvedValue('hashed-password');
    mockPrisma.adminUser.create.mockResolvedValue({
      id: 'admin-1',
      email: 'new@example.com',
      passwordHash: 'hashed-password'
    });

    const user = await registerUser({ email: 'new@example.com', password: 'secret123' });

    expect(mockBcrypt.hash).toHaveBeenCalledWith('secret123', 10);
    expect(user).toEqual({ id: 'admin-1', email: 'new@example.com' });
  });

  it('returns null when validating unknown user', async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValue(null);

    const user = await validateUser({ email: 'missing@example.com', password: 'secret123' });

    expect(user).toBeNull();
  });

  it('returns null when password does not match', async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      passwordHash: 'hashed-password'
    });
    mockBcrypt.compare.mockResolvedValue(false);

    const user = await validateUser({ email: 'admin@example.com', password: 'wrong' });

    expect(user).toBeNull();
  });

  it('returns sanitized user when credentials are valid', async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      passwordHash: 'hashed-password'
    });
    mockBcrypt.compare.mockResolvedValue(true);

    const user = await validateUser({ email: 'admin@example.com', password: 'secret123' });

    expect(user).toEqual({ id: 'admin-1', email: 'admin@example.com' });
  });

  it('generates admin jwt token with expected payload', () => {
    mockJwt.sign.mockReturnValue('signed-token');

    const token = generateToken(
      { id: 'admin-1', email: 'admin@example.com' } as unknown as Parameters<typeof generateToken>[0]
    );

    expect(token).toBe('signed-token');
    expect(mockJwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'admin-1',
        email: 'admin@example.com',
        role: 'admin'
      }),
      'test-secret',
      expect.objectContaining({ expiresIn: '8h' })
    );
  });
});
