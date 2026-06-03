import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { BookingErrorCodes } from '../../../../src/modules/booking/booking.types';

  const { mockPrisma } = vi.hoisted(() => ({
    mockPrisma: {
      $transaction: vi.fn(),
      booking: {
        findUnique: vi.fn(),
        update: vi.fn()
      }
    }
  }));

vi.mock('../../../../src/config/prisma', () => ({
  default: mockPrisma
}));

import { createBooking } from '../../../../src/modules/booking/booking.services';
import { cancelBooking } from '../../../../src/modules/booking/booking.services';

type TxCallback<T> = (transactionClient: T) => unknown;
type TxOptions = {
  isolationLevel?: Prisma.TransactionIsolationLevel;
};

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

const buildTransactionContext = (
  overrides: {
    service?: Record<string, unknown>;
    bookings?: Array<{ bookingTime: Date; durationMinutes: number }>;
    blocks?: Array<{ startTime: Date; endTime: Date }>;
    createResult?: Record<string, unknown>;
  } = {}
) => {
  const serviceRecord = {
    id: 'service-1',
    isActive: true,
    durationMinutes: 45,
    adminId: 'admin-1',
    admin: {
      id: 'admin-1',
      minBookingNoticeMinutes: 60,
      schedule
    },
    ...overrides.service
  };

  const createdBooking = {
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
    },
    ...overrides.createResult
  };

  return {
    service: {
      findUnique: vi.fn().mockResolvedValue(serviceRecord)
    },
    adminUser: {
      findUnique: vi.fn().mockResolvedValue({ schedule })
    },
    booking: {
      findMany: vi.fn().mockResolvedValue(overrides.bookings ?? []),
      create: vi.fn().mockResolvedValue(createdBooking)
    },
    availabilityBlock: {
      findMany: vi.fn().mockResolvedValue(overrides.blocks ?? [])
    }
  };
};

describe('booking.services.createBooking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects booking that does not meet minimum notice', async () => {
    const tx = {
      service: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'service-1',
          isActive: true,
          durationMinutes: 30,
          adminId: 'admin-1',
          admin: {
            id: 'admin-1',
            minBookingNoticeMinutes: 60,
            schedule
          }
        })
      }
    };

    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => {
      return callback(tx);
    });

    await expect(
      createBooking('client-1', {
        serviceId: 'service-1',
        bookingTime: new Date('2030-01-01T00:30:00.000Z')
      })
    ).rejects.toMatchObject({
      code: BookingErrorCodes.INSUFFICIENT_NOTICE,
      statusCode: 400
    });
  });

  it('rejects when slot is no longer available because of conflict', async () => {
    const createSpy = vi.fn();

    const tx = {
      service: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'service-1',
          isActive: true,
          durationMinutes: 30,
          adminId: 'admin-1',
          admin: {
            id: 'admin-1',
            minBookingNoticeMinutes: 60,
            schedule
          }
        })
      },
      adminUser: {
        findUnique: vi.fn().mockResolvedValue({ schedule })
      },
      booking: {
        findMany: vi.fn().mockResolvedValue([
          {
            bookingTime: new Date('2030-01-02T10:00:00.000Z'),
            durationMinutes: 30
          }
        ]),
        create: createSpy
      },
      availabilityBlock: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };

    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => {
      return callback(tx);
    });

    await expect(
      createBooking('client-1', {
        serviceId: 'service-1',
        bookingTime: new Date('2030-01-02T10:00:00.000Z')
      })
    ).rejects.toMatchObject({
      code: BookingErrorCodes.UNAVAILABLE_TIME,
      statusCode: 409
    });

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('creates booking successfully and snapshots service duration', async () => {
    const tx = buildTransactionContext();

    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>, options: TxOptions) => {
      expect(options).toEqual(
        expect.objectContaining({
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        })
      );
      return callback(tx);
    });

    const booking = await createBooking('client-1', {
      serviceId: 'service-1',
      bookingTime: new Date('2030-01-02T10:00:00.000Z')
    });

    expect(booking.id).toBe('booking-1');
    expect(tx.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'client-1',
          adminId: 'admin-1',
          serviceId: 'service-1',
          durationMinutes: 45
        })
      })
    );
    expect(tx.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          adminId: 'admin-1',
          status: 'CONFIRMED'
        })
      })
    );
  });

  it('maps Prisma transaction conflicts to UNAVAILABLE_TIME', async () => {
    mockPrisma.$transaction.mockRejectedValue(createPrismaKnownError('P2034'));

    await expect(
      createBooking('client-1', {
        serviceId: 'service-1',
        bookingTime: new Date('2030-01-02T10:00:00.000Z')
      })
    ).rejects.toMatchObject({
      code: BookingErrorCodes.UNAVAILABLE_TIME,
      statusCode: 409
    });
  });

  it('allows only one success when two concurrent requests race for same slot', async () => {
    const tx = buildTransactionContext();

    mockPrisma.$transaction
      .mockImplementationOnce(async (callback: TxCallback<typeof tx>) => callback(tx))
      .mockRejectedValueOnce(createPrismaKnownError('P2034'));

    const [firstAttempt, secondAttempt] = await Promise.allSettled([
      createBooking('client-1', {
        serviceId: 'service-1',
        bookingTime: new Date('2030-01-02T10:00:00.000Z')
      }),
      createBooking('client-2', {
        serviceId: 'service-1',
        bookingTime: new Date('2030-01-02T10:00:00.000Z')
      })
    ]);

    expect(firstAttempt.status).toBe('fulfilled');
    expect(secondAttempt.status).toBe('rejected');

    if (secondAttempt.status === 'rejected') {
      expect(secondAttempt.reason).toMatchObject({
        code: BookingErrorCodes.UNAVAILABLE_TIME,
        statusCode: 409
      });
    }

    expect(tx.booking.create).toHaveBeenCalledTimes(1);
  });

  it('persists notes when provided in the create payload', async () => {
    const tx = buildTransactionContext();

    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => callback(tx));

    await createBooking('client-1', {
      serviceId: 'service-1',
      bookingTime: new Date('2030-01-02T10:00:00.000Z'),
      notes: 'Cliente prefiere atencion por la tarde'
    });

    expect(tx.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: 'Cliente prefiere atencion por la tarde'
        })
      })
    );
  });

  it('persists null notes when not provided', async () => {
    const tx = buildTransactionContext();

    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => callback(tx));

    await createBooking('client-1', {
      serviceId: 'service-1',
      bookingTime: new Date('2030-01-02T10:00:00.000Z')
    });

    expect(tx.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: null
        })
      })
    );
  });
});

describe('booking.services.cancelBooking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 404 when booking does not exist', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(null);

    await expect(cancelBooking('booking-missing', 'client-1')).rejects.toMatchObject({
      code: BookingErrorCodes.BOOKING_NOT_FOUND,
      statusCode: 404
    });
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });

  it('returns 403 when booking belongs to a different client', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      clientId: 'other-client',
      adminId: 'admin-1',
      status: 'CONFIRMED',
      bookingTime: new Date('2030-02-01T10:00:00.000Z'),
      admin: { minCancellationNoticeMinutes: 120 },
      service: { id: 'service-1', name: 'Corte', durationMinutes: 45, price: 500 },
      client: { id: 'other-client', name: 'Otro', email: 'otro@example.com', phone: '099' }
    });

    await expect(cancelBooking('booking-1', 'client-1')).rejects.toMatchObject({
      code: BookingErrorCodes.UNAUTHORIZED,
      statusCode: 403
    });
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });

  it('returns 400 when booking is already cancelled', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      clientId: 'client-1',
      adminId: 'admin-1',
      status: 'CANCELLED',
      bookingTime: new Date('2030-02-01T10:00:00.000Z'),
      admin: { minCancellationNoticeMinutes: 120 },
      service: { id: 'service-1', name: 'Corte', durationMinutes: 45, price: 500 },
      client: { id: 'client-1', name: 'Ana', email: 'ana@example.com', phone: '099' }
    });

    await expect(cancelBooking('booking-1', 'client-1')).rejects.toMatchObject({
      code: BookingErrorCodes.CANNOT_CANCEL,
      statusCode: 400
    });
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });

  it('returns 400 when cancellation notice is not respected', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      clientId: 'client-1',
      adminId: 'admin-1',
      status: 'CONFIRMED',
      bookingTime: new Date('2030-01-01T01:00:00.000Z'),
      admin: { minCancellationNoticeMinutes: 120 },
      service: { id: 'service-1', name: 'Corte', durationMinutes: 45, price: 500 },
      client: { id: 'client-1', name: 'Ana', email: 'ana@example.com', phone: '099' }
    });

    await expect(cancelBooking('booking-1', 'client-1')).rejects.toMatchObject({
      code: BookingErrorCodes.CANNOT_CANCEL,
      statusCode: 400
    });
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });

  it('sets status CANCELLED, cancelledAt and cancellationReason on success', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      clientId: 'client-1',
      adminId: 'admin-1',
      status: 'CONFIRMED',
      bookingTime: new Date('2030-02-01T10:00:00.000Z'),
      admin: { minCancellationNoticeMinutes: 120 },
      service: { id: 'service-1', name: 'Corte', durationMinutes: 45, price: 500 },
      client: { id: 'client-1', name: 'Ana', email: 'ana@example.com', phone: '099' }
    });
    mockPrisma.booking.update.mockResolvedValue({
      id: 'booking-1',
      clientId: 'client-1',
      adminId: 'admin-1',
      serviceId: 'service-1',
      bookingTime: new Date('2030-02-01T10:00:00.000Z'),
      durationMinutes: 45,
      status: 'CANCELLED',
      cancelledAt: new Date('2030-01-01T00:00:00.000Z'),
      cancellationReason: 'CANCELLED_BY_CLIENT',
      service: { id: 'service-1', name: 'Corte', durationMinutes: 45, price: 500 },
      client: { id: 'client-1', name: 'Ana', email: 'ana@example.com', phone: '099' }
    });

    await cancelBooking('booking-1', 'client-1');

    expect(mockPrisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancellationReason: 'CANCELLED_BY_CLIENT'
        })
      })
    );
  });
});
