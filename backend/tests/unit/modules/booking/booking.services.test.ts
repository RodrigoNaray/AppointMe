import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { BookingErrorCodes } from '../../../../src/modules/booking/booking.types';

  const { mockPrisma } = vi.hoisted(() => ({
    mockPrisma: {
      $transaction: vi.fn(),
      booking: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn()
      },
      service: { count: vi.fn() },
      client: { count: vi.fn() }
    }
  }));

vi.mock('../../../../src/config/prisma', () => ({
  default: mockPrisma
}));

import { createBooking, getBookingMetrics } from '../../../../src/modules/booking/booking.services';
import { cancelBooking } from '../../../../src/modules/booking/booking.services';
import { cancelBookingByAdmin } from '../../../../src/modules/booking/booking.services';
import { rescheduleBookingByAdmin } from '../../../../src/modules/booking/booking.services';

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
      minBookingAdvanceMinutes: 60,
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
    client: {
      findUnique: vi.fn().mockResolvedValue({ emailVerified: true, googleId: null })
    },
    service: {
      findUnique: vi.fn().mockResolvedValue(serviceRecord)
    },
    adminUser: {
      findUnique: vi.fn().mockResolvedValue({ schedule })
    },
    booking: {
      findMany: vi.fn().mockResolvedValue(overrides.bookings ?? []),
      create: vi.fn().mockResolvedValue(createdBooking),
      findFirst: vi.fn(),
      update: vi.fn()
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

  it('rejects with EMAIL_NOT_FOUND when client does not exist in DB', async () => {
    const tx = {
      client: {
        findUnique: vi.fn().mockResolvedValue(null)
      }
    };

    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => {
      return callback(tx);
    });

    await expect(
      createBooking('nonexistent-client', {
        serviceId: 'service-1',
        bookingTime: new Date('2030-01-02T10:00:00.000Z')
      })
    ).rejects.toMatchObject({
      code: BookingErrorCodes.BOOKING_NOT_FOUND,
      statusCode: 404
    });
  });

  it('rejects with EMAIL_NOT_VERIFIED when client email is not verified', async () => {
    const tx = {
      client: {
        findUnique: vi.fn().mockResolvedValue({ emailVerified: false, googleId: null })
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
      code: BookingErrorCodes.EMAIL_NOT_VERIFIED,
      statusCode: 403
    });
  });

  it('allows booking for Google OAuth client even when email is not verified', async () => {
    const tx = {
      client: {
        findUnique: vi.fn().mockResolvedValue({ emailVerified: false, googleId: 'google-123' })
      },
      service: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'service-1',
          isActive: true,
          durationMinutes: 30,
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
          clientId: 'client-1',
          adminId: 'admin-1',
          serviceId: 'service-1',
          bookingTime: new Date('2030-01-02T10:00:00.000Z'),
          durationMinutes: 30,
          status: 'CONFIRMED'
        })
      },
      availabilityBlock: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };

    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => {
      return callback(tx);
    });

    const booking = await createBooking('client-1', {
      serviceId: 'service-1',
      bookingTime: new Date('2030-01-02T10:00:00.000Z')
    });

    expect(booking.id).toBe('booking-1');
    expect(tx.booking.create).toHaveBeenCalled();
  });

  it('rejects booking that does not meet minimum notice', async () => {
    const tx = {
      client: {
        findUnique: vi.fn().mockResolvedValue({ emailVerified: true, googleId: null })
      },
      service: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'service-1',
          isActive: true,
          durationMinutes: 30,
          adminId: 'admin-1',
          admin: {
            id: 'admin-1',
            minBookingAdvanceMinutes: 60,
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
      client: {
        findUnique: vi.fn().mockResolvedValue({ emailVerified: true, googleId: null })
      },
      service: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'service-1',
          isActive: true,
          durationMinutes: 30,
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

  it('allows re-booking the same slot after a cancellation', async () => {
    const tx = buildTransactionContext({
      bookings: []
    });

    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => {
      return callback(tx);
    });

    const booking = await createBooking('client-1', {
      serviceId: 'service-1',
      bookingTime: new Date('2030-01-02T10:00:00.000Z')
    });

    expect(booking.id).toBe('booking-1');
    expect(tx.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'CONFIRMED'
        })
      })
    );
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
  const buildCancelTransaction = (bookingRecord: unknown, updateResult?: unknown) => {
    const tx = {
      booking: {
        findUnique: vi.fn().mockResolvedValue(bookingRecord),
        update: vi.fn().mockResolvedValue(updateResult ?? bookingRecord),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => callback(tx));
    return tx;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 404 when booking does not exist', async () => {
    const tx = buildCancelTransaction(null);

    await expect(cancelBooking('booking-missing', 'client-1')).rejects.toMatchObject({
      code: BookingErrorCodes.BOOKING_NOT_FOUND,
      statusCode: 404
    });
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it('returns 403 when booking belongs to a different client', async () => {
    const tx = buildCancelTransaction({
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
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it('returns 400 when booking is already cancelled', async () => {
    const tx = buildCancelTransaction({
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
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it('returns 400 when cancellation notice is not respected', async () => {
    const tx = buildCancelTransaction({
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
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it('sets status CANCELLED, cancelledAt and cancellationReason on success', async () => {
    const tx = buildCancelTransaction(
      {
        id: 'booking-1',
        clientId: 'client-1',
        adminId: 'admin-1',
        status: 'CONFIRMED',
        bookingTime: new Date('2030-02-01T10:00:00.000Z'),
        admin: { minCancellationNoticeMinutes: 120 },
        service: { id: 'service-1', name: 'Corte', durationMinutes: 45, price: 500 },
        client: { id: 'client-1', name: 'Ana', email: 'ana@example.com', phone: '099' }
      },
      {
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
      }
    );

    await cancelBooking('booking-1', 'client-1');

    expect(tx.booking.update).toHaveBeenCalledWith(
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

describe('booking.services.cancelBookingByAdmin', () => {
  const adminBookingRecord = {
    id: 'booking-1',
    adminId: 'admin-1',
    clientId: 'client-1',
    serviceId: 'service-1',
    bookingTime: new Date('2030-01-02T10:00:00.000Z'),
    durationMinutes: 45,
    status: 'CONFIRMED',
    notes: null,
    service: { id: 'service-1', name: 'Corte', durationMinutes: 45, price: 500 },
    client: { id: 'client-1', name: 'Ana', email: 'ana@example.com', phone: '099' }
  };

  const updatedAdminBooking = {
    ...adminBookingRecord,
    status: 'CANCELLED',
    cancelledAt: new Date('2030-01-01T00:00:00.000Z'),
    cancellationReason: 'CANCELLED_BY_ADMIN'
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 404 when booking does not exist for admin', async () => {
    const tx = {
      booking: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn()
      }
    };
    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => callback(tx));

    await expect(
      cancelBookingByAdmin({ bookingId: 'booking-missing', adminId: 'admin-1' })
    ).rejects.toMatchObject({
      code: BookingErrorCodes.BOOKING_NOT_FOUND,
      statusCode: 404
    });
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it('returns 400 when booking is already cancelled', async () => {
    const tx = {
      booking: {
        findFirst: vi.fn().mockResolvedValue({ ...adminBookingRecord, status: 'CANCELLED' }),
        update: vi.fn()
      }
    };
    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => callback(tx));

    await expect(
      cancelBookingByAdmin({ bookingId: 'booking-1', adminId: 'admin-1' })
    ).rejects.toMatchObject({
      code: BookingErrorCodes.CANNOT_CANCEL,
      statusCode: 400
    });
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it('returns 400 when the booking has already started', async () => {
    const tx = {
      booking: {
        findFirst: vi.fn().mockResolvedValue({
          ...adminBookingRecord,
          bookingTime: new Date('2029-12-31T23:00:00.000Z')
        }),
        update: vi.fn()
      }
    };
    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => callback(tx));

    await expect(
      cancelBookingByAdmin({ bookingId: 'booking-1', adminId: 'admin-1' })
    ).rejects.toMatchObject({
      code: BookingErrorCodes.BOOKING_ALREADY_PASSED,
      statusCode: 400
    });
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it('cancels a future booking with CANCELLED_BY_ADMIN reason', async () => {
    const tx = {
      booking: {
        findFirst: vi.fn().mockResolvedValue({ ...adminBookingRecord }),
        update: vi.fn().mockResolvedValue(updatedAdminBooking)
      }
    };
    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => callback(tx));

    const result = await cancelBookingByAdmin({ bookingId: 'booking-1', adminId: 'admin-1' });

    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancellationReason: 'CANCELLED_BY_ADMIN'
        })
      })
    );
    expect(result.clientEmail).toBe('ana@example.com');
    expect(result.serviceName).toBe('Corte');
    expect(result.durationMinutes).toBe(45);
  });

  it('appends the admin reason to existing notes when provided', async () => {
    const tx = {
      booking: {
        findFirst: vi.fn().mockResolvedValue({ ...adminBookingRecord, notes: 'Cliente prefiere tarde' }),
        update: vi.fn().mockResolvedValue(updatedAdminBooking)
      }
    };
    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => callback(tx));

    await cancelBookingByAdmin({
      bookingId: 'booking-1',
      adminId: 'admin-1',
      reason: 'Emergencia del staff'
    });

    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: 'Cliente prefiere tarde\n\n[Admin cancel reason]: Emergencia del staff'
        })
      })
    );
  });
});

describe('booking.services.rescheduleBookingByAdmin', () => {
  const baseBooking = {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when newBookingTime is invalid', async () => {
    await expect(
      rescheduleBookingByAdmin({
        bookingId: 'booking-1',
        adminId: 'admin-1',
        newBookingTime: new Date('not-a-date')
      })
    ).rejects.toMatchObject({
      code: BookingErrorCodes.INVALID_INPUT,
      statusCode: 400
    });
  });

  it('returns 404 when booking does not belong to admin', async () => {
    const tx = {
      booking: { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn() },
      adminUser: { findUnique: vi.fn() },
      availabilityBlock: { findMany: vi.fn() }
    };
    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => callback(tx));

    await expect(
      rescheduleBookingByAdmin({
        bookingId: 'booking-missing',
        adminId: 'admin-1',
        newBookingTime: new Date('2030-01-06T10:00:00.000Z')
      })
    ).rejects.toMatchObject({
      code: BookingErrorCodes.BOOKING_NOT_FOUND,
      statusCode: 404
    });
  });

  it('returns 400 when booking is not CONFIRMED', async () => {
    const tx = {
      booking: {
        findFirst: vi.fn().mockResolvedValue({ ...baseBooking, status: 'CANCELLED' }),
        update: vi.fn()
      },
      adminUser: { findUnique: vi.fn() },
      availabilityBlock: { findMany: vi.fn() }
    };
    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => callback(tx));

    await expect(
      rescheduleBookingByAdmin({
        bookingId: 'booking-1',
        adminId: 'admin-1',
        newBookingTime: new Date('2030-01-06T10:00:00.000Z')
      })
    ).rejects.toMatchObject({
      code: BookingErrorCodes.CANNOT_CANCEL,
      statusCode: 400
    });
  });

  it('returns 400 when the booking has already started', async () => {
    const tx = {
      booking: {
        findFirst: vi.fn().mockResolvedValue({
          ...baseBooking,
          bookingTime: new Date('2020-01-05T10:00:00.000Z')
        }),
        update: vi.fn()
      },
      adminUser: { findUnique: vi.fn() },
      availabilityBlock: { findMany: vi.fn() }
    };
    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => callback(tx));

    await expect(
      rescheduleBookingByAdmin({
        bookingId: 'booking-1',
        adminId: 'admin-1',
        newBookingTime: new Date('2030-01-06T10:00:00.000Z')
      })
    ).rejects.toMatchObject({
      code: BookingErrorCodes.BOOKING_ALREADY_PASSED,
      statusCode: 400
    });
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it('returns 409 when the new slot conflicts with another confirmed booking', async () => {
    const newTime = new Date('2030-01-06T10:00:00.000Z');
    const conflictingBooking = {
      bookingTime: newTime,
      durationMinutes: 45
    };
    const tx = {
      booking: {
        findFirst: vi.fn().mockResolvedValue({ ...baseBooking }),
        findMany: vi.fn().mockResolvedValue([conflictingBooking]),
        update: vi.fn()
      },
      adminUser: {
        findUnique: vi.fn().mockResolvedValue({ schedule })
      },
      availabilityBlock: { findMany: vi.fn().mockResolvedValue([]) }
    };
    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => callback(tx));

    await expect(
      rescheduleBookingByAdmin({
        bookingId: 'booking-1',
        adminId: 'admin-1',
        newBookingTime: newTime
      })
    ).rejects.toMatchObject({
      code: BookingErrorCodes.UNAVAILABLE_TIME,
      statusCode: 409
    });
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it('returns 200 and updates bookingTime when the new slot is free', async () => {
    const newTime = new Date('2030-01-06T10:00:00.000Z');
    const updated = { ...baseBooking, bookingTime: newTime };
    const tx = {
      booking: {
        findFirst: vi.fn().mockResolvedValue({ ...baseBooking }),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue(updated)
      },
      adminUser: {
        findUnique: vi.fn().mockResolvedValue({ schedule })
      },
      availabilityBlock: { findMany: vi.fn().mockResolvedValue([]) }
    };
    mockPrisma.$transaction.mockImplementation(async (callback: TxCallback<typeof tx>) => callback(tx));

    const result = await rescheduleBookingByAdmin({
      bookingId: 'booking-1',
      adminId: 'admin-1',
      newBookingTime: newTime
    });

    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: { bookingTime: newTime }
      })
    );
    expect(result.oldBookingTime.toISOString()).toBe(baseBooking.bookingTime.toISOString());
    expect(result.newBookingTime.toISOString()).toBe(newTime.toISOString());
    expect(result.clientEmail).toBe('ana@example.com');
  });
});

describe('booking.services.getBookingMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-06-15T12:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns correct counts and revenue with mixed data', async () => {
    mockPrisma.booking.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(4);

    mockPrisma.booking.findMany
      .mockResolvedValueOnce([
        { service: { price: 500 } },
        { service: { price: 700 } },
        { service: { price: 300 } }
      ])
      .mockResolvedValueOnce([
        { service: { price: 500 } },
        { service: { price: 500 } }
      ]);

    mockPrisma.service.count.mockResolvedValue(8);
    mockPrisma.client.count.mockResolvedValue(12);

    const metrics = await getBookingMetrics('admin-1');

    expect(metrics.todayBookings).toBe(3);
    expect(metrics.yesterdayBookings).toBe(1);
    expect(metrics.monthRevenue).toBe(1500);
    expect(metrics.lastMonthRevenue).toBe(1000);
    expect(metrics.activeServices).toBe(8);
    expect(metrics.newClientsThisMonth).toBe(12);
    expect(metrics.upcomingBookings).toBe(5);
    expect(metrics.cancellationRate).toBeCloseTo(0.2, 2);
  });

  it('returns zero values when no data exists', async () => {
    mockPrisma.booking.count.mockResolvedValue(0);
    mockPrisma.booking.findMany.mockResolvedValue([]);
    mockPrisma.service.count.mockResolvedValue(0);
    mockPrisma.client.count.mockResolvedValue(0);

    const metrics = await getBookingMetrics('admin-1');

    expect(metrics.todayBookings).toBe(0);
    expect(metrics.monthRevenue).toBe(0);
    expect(metrics.lastMonthRevenue).toBe(0);
    expect(metrics.activeServices).toBe(0);
    expect(metrics.newClientsThisMonth).toBe(0);
    expect(metrics.cancellationRate).toBe(0);
  });

  it('filters booking queries by adminId', async () => {
    mockPrisma.booking.count.mockResolvedValue(0);
    mockPrisma.booking.findMany.mockResolvedValue([]);
    mockPrisma.service.count.mockResolvedValue(0);
    mockPrisma.client.count.mockResolvedValue(0);

    await getBookingMetrics('specific-admin');

    const countCalls = mockPrisma.booking.count.mock.calls;
    for (const call of countCalls) {
      expect(call[0]?.where?.adminId).toBe('specific-admin');
    }

    const findManyCalls = mockPrisma.booking.findMany.mock.calls;
    for (const call of findManyCalls) {
      expect(call[0]?.where?.adminId).toBe('specific-admin');
    }

    expect(mockPrisma.service.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { adminId: 'specific-admin', isActive: true } })
    );
  });
});
