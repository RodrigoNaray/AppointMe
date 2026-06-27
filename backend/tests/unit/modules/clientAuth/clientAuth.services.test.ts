import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../../../src/utils/error';

const {
  mockPrisma,
  mockBcrypt,
  mockJwt,
  mockEmailService,
  mockTokenUtils
} = vi.hoisted(() => ({
  mockPrisma: {
    client: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    }
  },
  mockBcrypt: {
    hash: vi.fn(),
    compare: vi.fn()
  },
  mockJwt: {
    sign: vi.fn()
  },
  mockEmailService: {
    sendVerificationEmail: vi.fn(),
    sendEmailChangeVerification: vi.fn(),
    sendPasswordResetEmail: vi.fn()
  },
  mockTokenUtils: {
    generateTokenWithExpiration: vi.fn()
  }
}));

vi.mock('../../../../src/config/prisma', () => ({
  default: mockPrisma
}));

vi.mock('bcryptjs', () => ({
  default: mockBcrypt
}));

vi.mock('jsonwebtoken', () => ({
  default: mockJwt
}));

vi.mock('../../../../src/services/emailService', () => ({
  sendVerificationEmail: mockEmailService.sendVerificationEmail,
  sendEmailChangeVerification: mockEmailService.sendEmailChangeVerification,
  sendPasswordResetEmail: mockEmailService.sendPasswordResetEmail
}));

vi.mock('../../../../src/utils/tokenUtils', () => ({
  generateTokenWithExpiration: mockTokenUtils.generateTokenWithExpiration
}));

vi.mock('../../../../src/config/auth.config', () => ({
  JWT_SECRET: 'test-secret',
  JWT_EXPIRATION: '24h'
}));

import {
  registerClient,
  validateClient,
  generateClientToken,
  verifyClientEmail,
  resendVerificationEmail,
  requestEmailChange,
  verifyEmailChange,
  changePassword,
  requestPasswordReset,
  resetPassword
} from '../../../../src/modules/clientAuth/clientAuth.services';

describe('clientAuth.services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));

    mockTokenUtils.generateTokenWithExpiration.mockReturnValue({
      token: 'generated-token',
      expiration: new Date('2030-01-02T00:00:00.000Z')
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws ConflictError when registering duplicated email', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: 'client-1' });

    await expect(
      registerClient({ email: 'ana@example.com', name: 'Ana', phone: '099123456', password: 'secret123' })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('registers client and returns sanitized object', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);
    mockBcrypt.hash.mockResolvedValue('hashed-password');
    mockPrisma.client.create.mockResolvedValue({
      id: 'client-1',
      email: 'ana@example.com',
      name: 'Ana',
      phone: '099123456',
      passwordHash: 'hashed-password',
      emailVerified: false,
      emailVerificationToken: 'generated-token',
      emailVerificationExpires: new Date('2030-01-02T00:00:00.000Z')
    });
    mockEmailService.sendVerificationEmail.mockResolvedValue(true);

    const client = await registerClient({
      email: 'ana@example.com',
      name: 'Ana',
      phone: '099123456',
      password: 'secret123'
    });

    expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect('passwordHash' in client).toBe(false);
    expect('emailVerificationToken' in client).toBe(false);
    expect(client.id).toBe('client-1');
  });

  it('returns null when validateClient cannot find user', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);

    const result = await validateClient({ email: 'missing@example.com', password: 'secret123' });

    expect(result).toBeNull();
  });

  it('returns null when password is invalid', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
      email: 'ana@example.com',
      passwordHash: 'hashed-password'
    });
    mockBcrypt.compare.mockResolvedValue(false);

    const result = await validateClient({ email: 'ana@example.com', password: 'bad' });

    expect(result).toBeNull();
  });

  it('returns public client when credentials are valid', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
      email: 'ana@example.com',
      name: 'Ana',
      phone: '099123456',
      passwordHash: 'hashed-password',
      emailVerificationToken: 'generated-token'
    });
    mockBcrypt.compare.mockResolvedValue(true);

    const result = await validateClient({ email: 'ana@example.com', password: 'secret123' });

    expect(result?.id).toBe('client-1');
    expect(result).not.toBeNull();
    if (result) {
      expect('passwordHash' in result).toBe(false);
    }
  });

  it('generates client token with expected payload', () => {
    mockJwt.sign.mockReturnValue('client-jwt');

    const token = generateClientToken({
      id: 'client-1',
      email: 'ana@example.com',
      name: 'Ana'
    } as unknown as Parameters<typeof generateClientToken>[0]);

    expect(token).toBe('client-jwt');
    expect(mockJwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'client', sub: 'client-1' }),
      'test-secret',
      expect.objectContaining({ expiresIn: '24h' })
    );
  });

  it('returns failure when verifyClientEmail token is invalid', async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null);

    const result = await verifyClientEmail('invalid-token');

    expect(result.success).toBe(false);
  });

  it('returns success when verifyClientEmail token is valid', async () => {
    mockPrisma.client.findFirst.mockResolvedValue({
      id: 'client-1',
      emailVerified: false,
      emailVerificationExpires: new Date('2030-01-02T00:00:00.000Z')
    });
    mockPrisma.client.update.mockResolvedValue({
      id: 'client-1',
      email: 'ana@example.com',
      name: 'Ana',
      phone: '099123456',
      emailVerified: true,
      passwordHash: 'hashed-password',
      emailVerificationToken: null
    });

    const result = await verifyClientEmail('valid-token');

    expect(result.success).toBe(true);
    expect(mockPrisma.client.update).toHaveBeenCalled();
  });

  it('returns false in resendVerificationEmail for verified clients', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
      email: 'ana@example.com',
      name: 'Ana',
      emailVerified: true
    });

    const result = await resendVerificationEmail('client-1');

    expect(result).toBe(false);
  });

  it('rejects email change request when password is wrong', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
      email: 'ana@example.com',
      name: 'Ana',
      passwordHash: 'hashed-password',
      googleId: null
    });
    mockBcrypt.compare.mockResolvedValue(false);

    const result = await requestEmailChange('client-1', {
      newEmail: 'nuevo@example.com',
      password: 'bad-password'
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Contraseña incorrecta');
  });

  it('returns failure when verifyEmailChange token is invalid', async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null);

    const result = await verifyEmailChange('invalid-token');

    expect(result.success).toBe(false);
  });

  it('allows setting first password for OAuth users', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
      email: 'ana@example.com',
      googleId: 'google-1',
      passwordHash: null
    });
    mockBcrypt.hash.mockResolvedValue('new-hash');
    mockPrisma.client.update.mockResolvedValue({ id: 'client-1' });

    const result = await changePassword('client-1', {
      currentPassword: '',
      newPassword: 'new-secret123'
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.client.update).toHaveBeenCalled();
  });

  it('returns true for password reset request even when email does not exist', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);

    const result = await requestPasswordReset('missing@example.com');

    expect(result).toBe(true);
  });

  it('stores reset token and sends email when password reset is requested', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
      email: 'ana@example.com',
      name: 'Ana'
    });
    mockPrisma.client.update.mockResolvedValue({ id: 'client-1' });
    mockEmailService.sendPasswordResetEmail.mockResolvedValue(true);

    const result = await requestPasswordReset('ana@example.com');

    expect(result).toBe(true);
    expect(mockPrisma.client.update).toHaveBeenCalled();
    expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
  });

  it('throws when resetPassword receives a short password', async () => {
    await expect(resetPassword('token', '123')).rejects.toThrow('al menos 8 caracteres');
  });

  it('throws when resetPassword token is invalid', async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null);

    await expect(resetPassword('invalid-token', 'new-secret123')).rejects.toThrow('inválido o expirado');
  });

  it('resets password and clears reset token when token is valid', async () => {
    mockPrisma.client.findFirst.mockResolvedValue({
      id: 'client-1',
      passwordResetExpires: new Date('2030-01-02T00:00:00.000Z')
    });
    mockBcrypt.hash.mockResolvedValue('new-hash');
    mockPrisma.client.update.mockResolvedValue({ id: 'client-1' });

    await resetPassword('valid-token', 'new-secret123');

    expect(mockPrisma.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: 'new-hash',
          passwordResetToken: null,
          passwordResetExpires: null
        })
      })
    );
  });
});
