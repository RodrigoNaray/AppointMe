import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

type ClientAuthUser = { id: string; email: string; name: string };
type AdminAuthUser = { id: string; email: string };
type ClientAuthRequest = Request & { user?: ClientAuthUser };
type AdminAuthRequest = Request & { user?: AdminAuthUser };

const { authState, mockPrisma, mockSendBookingConfirmationEmail, mockSendAdminCancellationEmail, mockSendBookingRescheduledEmail } = vi.hoisted(() => ({
  authState: {
    clientUser: { id: 'client-1', email: 'ana@example.com', name: 'Ana' } as ClientAuthUser,
    adminUser: { id: 'admin-1', email: 'admin@example.com' } as AdminAuthUser
  },
  mockPrisma: {
    $transaction: vi.fn(),
    booking: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    adminUser: { findUnique: vi.fn() },
    availabilityBlock: { findMany: vi.fn() }
  },
  mockSendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  mockSendAdminCancellationEmail: vi.fn().mockResolvedValue(undefined),
  mockSendBookingRescheduledEmail: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../../../src/config/prisma', () => ({
  default: mockPrisma
}));

vi.mock('../../../../src/services/emailService', () => ({
  sendBookingConfirmationEmail: mockSendBookingConfirmationEmail,
  sendAdminCancellationEmail: mockSendAdminCancellationEmail,
  sendBookingRescheduledEmail: mockSendBookingRescheduledEmail
}));

vi.mock('../../../../src/middlewares/isClientAuthenticated', () => ({
  isClientAuthenticated: (req: Request, _res: Response, next: NextFunction) => {
    if (authState.clientUser) {
      (req as ClientAuthRequest).user = authState.clientUser;
    }
    next();
  }
}));

vi.mock('../../../../src/middlewares/isAdminAuthenticated', () => ({
  isAdminAuthenticated: (req: Request, _res: Response, next: NextFunction) => {
    if (authState.adminUser) {
      (req as AdminAuthRequest).user = authState.adminUser;
    }
    next();
  }
}));

import bookingRoutes, { adminBookingRoutes } from '../../../../src/modules/booking/booking.routes';
import { createTestApp } from '../../../fixtures/testHelpers';

const schedule = {
  sunday: { isActive: true, start: '09:00', end: '18:00' },
  monday: { isActive: true, start: '09:00', end: '18:00' },
  tuesday: { isActive: true, start: '09:00', end: '18:00' },
  wednesday: { isActive: true, start: '09:00', end: '18:00' },
  thursday: { isActive: true, start: '09:00', end: '18:00' },
  friday: { isActive: true, start: '09:00', end: '18:00' },
  saturday: { isActive: true, start: '09:00', end: '18:00' }
};

const createPrismaKnownError = (code: 'P2002' | 'P2034') => {
  const error = Object.create(Prisma.PrismaClientKnownRequestError.prototype) as Prisma.PrismaClientKnownRequestError;
  Object.assign(error as object, {
    code,
    message: `mock prisma error ${code}`,
    clientVersion: '5.22.0'
  });
  return error;
};

const buildCreateBookingTx = (overrides?: { emailVerified?: boolean; googleId?: string | null }) => ({
  client: {
    findUnique: vi.fn().mockResolvedValue({ emailVerified: overrides?.emailVerified ?? true, googleId: overrides?.googleId ?? null })
  },
  service: {
    findUnique: vi.fn().mockResolvedValue({
      id: 'service-1',
      isActive: true,
      durationMinutes: 45,
      adminId: 'admin-1',
      admin: {
        id: 'admin-1',
        minBookingAdvanceMinutes: 60,
        schedule
      }
    })
  },
  adminUser: {
    findUnique: vi.fn().mockResolvedValue({ schedule })
  },
  booking: {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({
      id: 'booking-1',
      adminId: 'admin-1',
      clientId: 'client-1',
      serviceId: 'service-1',
      bookingTime: new Date('2030-01-02T10:00:00.000Z'),
      durationMinutes: 45,
      status: 'CONFIRMED',
      service: {
        id: 'service-1',
        name: 'Corte clasico',
        durationMinutes: 45,
        price: 500
      },
      client: {
        id: 'client-1',
        name: 'Ana',
        email: 'ana@example.com',
        phone: '099123456'
      }
    })
  },
  availabilityBlock: {
    findMany: vi.fn().mockResolvedValue([])
  }
});

describe('booking.routes (semi-real)', () => {
  const clientApp = createTestApp('/bookings', bookingRoutes);
  const adminApp = createTestApp('/admin/bookings', adminBookingRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    authState.clientUser = { id: 'client-1', email: 'ana@example.com', name: 'Ana' };
    authState.adminUser = { id: 'admin-1', email: 'admin@example.com' };
    mockPrisma.booking.findMany.mockResolvedValue([]);
    mockPrisma.booking.count.mockResolvedValue(0);
    mockPrisma.booking.findUnique.mockResolvedValue(null);
    mockPrisma.booking.findFirst.mockResolvedValue(null);
    mockPrisma.booking.update.mockResolvedValue(null);
  });

  it('returns 400 when required clientTimezone is missing', async () => {
    const response = await request(clientApp)
      .post('/bookings/create')
      .send({
        serviceId: 'service-1',
        bookingTime: '2030-01-02T10:00:00.000Z'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('client timezone');
  });

  it('creates booking through real service flow and sends confirmation email', async () => {
    const tx = buildCreateBookingTx();
    mockPrisma.$transaction.mockImplementation(
      async (callback: (transactionClient: ReturnType<typeof buildCreateBookingTx>) => unknown) => callback(tx)
    );

    const response = await request(clientApp)
      .post('/bookings/create')
      .send({
        serviceId: 'service-1',
        bookingTime: '2030-01-02T10:00:00.000Z',
        clientTimezone: 'America/Argentina/Buenos_Aires'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.booking.id).toBe('booking-1');
    expect(response.body.booking.durationMinutes).toBe(45);
    expect(tx.booking.create).toHaveBeenCalledTimes(1);
    expect(mockSendBookingConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        clientTimezone: 'America/Argentina/Buenos_Aires'
      })
    );
  });

  it('returns 409 when Prisma reports concurrent booking conflict', async () => {
    mockPrisma.$transaction.mockRejectedValue(createPrismaKnownError('P2034'));

    const response = await request(clientApp)
      .post('/bookings/create')
      .send({
        serviceId: 'service-1',
        bookingTime: '2030-01-02T10:00:00.000Z',
        clientTimezone: 'UTC'
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('not available');
  });

  it('returns 403 when client email is not verified', async () => {
    const tx = buildCreateBookingTx({ emailVerified: false, googleId: null });
    mockPrisma.$transaction.mockImplementation(
      async (callback: (transactionClient: ReturnType<typeof buildCreateBookingTx>) => unknown) => callback(tx)
    );

    const response = await request(clientApp)
      .post('/bookings/create')
      .send({
        serviceId: 'service-1',
        bookingTime: '2030-01-02T10:00:00.000Z',
        clientTimezone: 'America/Argentina/Buenos_Aires'
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('email');
    expect(response.body.message).toContain('verified');
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('returns paginated bookings for authenticated client', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([
      {
        id: 'booking-1',
        clientId: 'client-1',
        adminId: 'admin-1',
        serviceId: 'service-1',
        bookingTime: new Date('2030-01-05T10:00:00.000Z'),
        durationMinutes: 45,
        status: 'CONFIRMED',
        service: {
          id: 'service-1',
          name: 'Corte clasico',
          durationMinutes: 45,
          price: 500
        },
        client: {
          id: 'client-1',
          name: 'Ana',
          email: 'ana@example.com',
          phone: '099123456'
        }
      }
    ]);
    mockPrisma.booking.count.mockResolvedValue(1);

    const response = await request(clientApp)
      .get('/bookings/my')
      .query({ page: '1', limit: '10' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.bookings).toHaveLength(1);
    expect(response.body.pagination.total_count).toBe(1);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'client-1'
        })
      })
    );
  });

  it('returns 403 when client tries to cancel another client booking', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: 'booking-foreign',
      clientId: 'other-client',
      adminId: 'admin-1',
      serviceId: 'service-1',
      bookingTime: new Date('2030-01-05T10:00:00.000Z'),
      status: 'CONFIRMED',
      durationMinutes: 45,
      admin: { minCancellationNoticeMinutes: 120 },
      service: {
        id: 'service-1',
        name: 'Corte clasico',
        durationMinutes: 45,
        price: 500
      },
      client: {
        id: 'other-client',
        name: 'Otro',
        email: 'otro@example.com',
        phone: '099000000'
      }
    });

    const response = await request(clientApp).put('/bookings/booking-foreign/cancel');

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Unauthorized');
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });

  it('returns paginated bookings for authenticated admin', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([
      {
        id: 'booking-1',
        clientId: 'client-1',
        adminId: 'admin-1',
        serviceId: 'service-1',
        bookingTime: new Date('2030-01-05T10:00:00.000Z'),
        durationMinutes: 45,
        status: 'CONFIRMED',
        service: {
          id: 'service-1',
          name: 'Corte clasico',
          durationMinutes: 45,
          price: 500
        },
        client: {
          id: 'client-1',
          name: 'Ana',
          email: 'ana@example.com',
          phone: '099123456'
        }
      }
    ]);
    mockPrisma.booking.count.mockResolvedValue(1);

    const response = await request(adminApp)
      .get('/admin/bookings')
      .query({ page: '1', limit: '10' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.bookings).toHaveLength(1);
    expect(response.body.pagination.total_count).toBe(1);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          adminId: 'admin-1'
        })
      })
    );
  });

  it('admin cancels a booking successfully and emails the client', async () => {
    const tx = {
      booking: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'booking-1',
          adminId: 'admin-1',
          clientId: 'client-1',
          serviceId: 'service-1',
          bookingTime: new Date('2030-01-05T10:00:00.000Z'),
          durationMinutes: 45,
          status: 'CONFIRMED',
          notes: null,
          service: { id: 'service-1', name: 'Corte', durationMinutes: 45, price: 500 },
          client: { id: 'client-1', name: 'Ana', email: 'ana@example.com', phone: '099' }
        }),
        update: vi.fn().mockResolvedValue({
          id: 'booking-1',
          adminId: 'admin-1',
          clientId: 'client-1',
          serviceId: 'service-1',
          bookingTime: new Date('2030-01-05T10:00:00.000Z'),
          durationMinutes: 45,
          status: 'CANCELLED',
          cancellationReason: 'CANCELLED_BY_ADMIN',
          service: { id: 'service-1', name: 'Corte', durationMinutes: 45, price: 500 },
          client: { id: 'client-1', name: 'Ana', email: 'ana@example.com', phone: '099' }
        })
      }
    };
    mockPrisma.$transaction.mockImplementation(
      async (callback: (transactionClient: typeof tx) => unknown) => callback(tx)
    );

    const response = await request(adminApp)
      .put('/admin/bookings/booking-1/cancel')
      .send({ reason: 'Emergencia del staff' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.booking.status).toBe('CANCELLED');
    expect(tx.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'booking-1', adminId: 'admin-1' })
      })
    );
    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancellationReason: 'CANCELLED_BY_ADMIN'
        })
      })
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockSendAdminCancellationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        serviceName: 'Corte',
        reason: 'Emergencia del staff'
      })
    );
  });

  it('admin cancel returns 404 when booking does not belong to this admin', async () => {
    const tx = {
      booking: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn()
      }
    };
    mockPrisma.$transaction.mockImplementation(
      async (callback: (transactionClient: typeof tx) => unknown) => callback(tx)
    );

    const response = await request(adminApp).put('/admin/bookings/booking-missing/cancel');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it('admin cancel returns 400 when booking is already cancelled', async () => {
    const tx = {
      booking: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'booking-1',
          adminId: 'admin-1',
          clientId: 'client-1',
          serviceId: 'service-1',
          bookingTime: new Date('2030-01-05T10:00:00.000Z'),
          durationMinutes: 45,
          status: 'CANCELLED',
          notes: null,
          service: { id: 'service-1', name: 'Corte', durationMinutes: 45, price: 500 },
          client: { id: 'client-1', name: 'Ana', email: 'ana@example.com', phone: '099' }
        }),
        update: vi.fn()
      }
    };
    mockPrisma.$transaction.mockImplementation(
      async (callback: (transactionClient: typeof tx) => unknown) => callback(tx)
    );

    const response = await request(adminApp).put('/admin/bookings/booking-1/cancel');

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('already cancelled');
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it('admin cancel returns 401 when admin is not authenticated', async () => {
    authState.adminUser = null;

    const response = await request(adminApp).put('/admin/bookings/booking-1/cancel');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication');
    authState.adminUser = { id: 'admin-1', email: 'admin@example.com' };
  });

  it('admin cancel returns 400 when reason exceeds 500 chars', async () => {
    const longReason = 'a'.repeat(501);

    const response = await request(adminApp)
      .put('/admin/bookings/booking-1/cancel')
      .send({ reason: longReason });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('500 characters');
  });

  it('admin reschedules a booking and emails the client with old and new times', async () => {
    const newTime = new Date('2030-01-06T10:00:00.000Z');
    const tx = {
      booking: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'booking-1',
          adminId: 'admin-1',
          clientId: 'client-1',
          serviceId: 'service-1',
          bookingTime: new Date('2030-01-05T10:00:00.000Z'),
          durationMinutes: 45,
          status: 'CONFIRMED',
          notes: null,
          service: { id: 'service-1', name: 'Corte', durationMinutes: 45, price: 500 },
          client: { id: 'client-1', name: 'Ana', email: 'ana@example.com', phone: '099' }
        }),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({
          id: 'booking-1',
          adminId: 'admin-1',
          clientId: 'client-1',
          serviceId: 'service-1',
          bookingTime: newTime,
          durationMinutes: 45,
          status: 'CONFIRMED',
          service: { id: 'service-1', name: 'Corte', durationMinutes: 45, price: 500 },
          client: { id: 'client-1', name: 'Ana', email: 'ana@example.com', phone: '099' }
        })
      },
      adminUser: { findUnique: vi.fn().mockResolvedValue({ schedule }) },
      availabilityBlock: { findMany: vi.fn().mockResolvedValue([]) }
    };
    mockPrisma.$transaction.mockImplementation(
      async (callback: (transactionClient: typeof tx) => unknown) => callback(tx)
    );

    const response = await request(adminApp)
      .put('/admin/bookings/booking-1/reschedule')
      .send({ newBookingTime: newTime.toISOString() });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: { bookingTime: newTime }
      })
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockSendBookingRescheduledEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        serviceName: 'Corte',
        durationMinutes: 45
      })
    );
  });

  it('admin reschedule returns 404 when booking does not belong to admin', async () => {
    const tx = {
      booking: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn(), update: vi.fn() },
      adminUser: { findUnique: vi.fn() },
      availabilityBlock: { findMany: vi.fn() }
    };
    mockPrisma.$transaction.mockImplementation(
      async (callback: (transactionClient: typeof tx) => unknown) => callback(tx)
    );

    const response = await request(adminApp)
      .put('/admin/bookings/booking-missing/reschedule')
      .send({ newBookingTime: '2030-01-06T10:00:00.000Z' });

    expect(response.status).toBe(404);
  });

  it('admin reschedule returns 400 when newBookingTime is missing', async () => {
    const response = await request(adminApp)
      .put('/admin/bookings/booking-1/reschedule')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('newBookingTime');
  });

  it('admin reschedule returns 400 when newBookingTime is invalid', async () => {
    const response = await request(adminApp)
      .put('/admin/bookings/booking-1/reschedule')
      .send({ newBookingTime: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Invalid');
  });

  it('admin reschedule returns 409 when new slot is not available', async () => {
    const tx = {
      booking: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'booking-1',
          adminId: 'admin-1',
          clientId: 'client-1',
          serviceId: 'service-1',
          bookingTime: new Date('2030-01-05T10:00:00.000Z'),
          durationMinutes: 45,
          status: 'CONFIRMED',
          notes: null,
          service: { id: 'service-1', name: 'Corte', durationMinutes: 45, price: 500 },
          client: { id: 'client-1', name: 'Ana', email: 'ana@example.com', phone: '099' }
        }),
        findMany: vi.fn().mockResolvedValue([{
          bookingTime: new Date('2030-01-06T10:00:00.000Z'),
          durationMinutes: 45
        }]),
        update: vi.fn()
      },
      adminUser: { findUnique: vi.fn().mockResolvedValue({ schedule }) },
      availabilityBlock: { findMany: vi.fn().mockResolvedValue([]) }
    };
    mockPrisma.$transaction.mockImplementation(
      async (callback: (transactionClient: typeof tx) => unknown) => callback(tx)
    );

    const response = await request(adminApp)
      .put('/admin/bookings/booking-1/reschedule')
      .send({ newBookingTime: '2030-01-06T10:00:00.000Z' });

    expect(response.status).toBe(409);
    expect(tx.booking.update).not.toHaveBeenCalled();
  });
});
