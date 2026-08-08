import prisma from '../../config/prisma'
import { Prisma } from '@prisma/client';
import { 
  CreateBookingDTO, 
  BookingFiltersDTO, 
  BookingWithDetails,
  BookingMetrics,
  BookingError,
  BookingErrorCodes,
  CancelBookingByAdminResult,
  RescheduleBookingByAdminResult
} from './booking.types';
import { addMinutes } from 'date-fns';
import { hasTimeConflictOptimized, TimePeriod } from '../../utils/timeConflictUtils';
import logger from '../../utils/logger';

// Mapeo de los días de la semana de JavaScript (0=Domingo) a nuestros strings
const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

interface WeeklySchedule {
  [key: string]: {
    isActive: boolean;
    start: string;
    end: string;
  };
}

type BookingValidationDb = Pick<typeof prisma, 'adminUser' | 'booking' | 'availabilityBlock'>;

const getUtcDayRange = (date: Date): { start: Date; endExclusive: Date } => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const endExclusive = new Date(start);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { start, endExclusive };
};

const buildBookingError = (
  message: string,
  statusCode: number,
  code: BookingErrorCodes
): BookingError => {
  const error = new Error(message) as BookingError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

/**
 * Valida si una hora específica está disponible para una reserva
 */
const validateTimeSlotAvailability = async (
  db: BookingValidationDb,
  requestedTime: Date,
  serviceDuration: number,
  adminId: string,
  serviceId: string,
  excludeBookingId?: string
): Promise<boolean> => {
  try {
    const { start: dayStartUTC, endExclusive: dayEndUTCExclusive } = getUtcDayRange(requestedTime);

    // 1. Obtener el admin y su horario
    const adminUser = await db.adminUser.findUnique({
      where: { id: adminId },
      select: { schedule: true }
    });

    if (!adminUser || !adminUser.schedule) {
      return false;
    }

    // 2. Verificar que esté dentro del horario de trabajo
    const dayOfWeekIndex = requestedTime.getUTCDay();
    const dayOfWeek = dayMap[dayOfWeekIndex];
    const schedule = adminUser.schedule as unknown as WeeklySchedule;
    const daySchedule = schedule[dayOfWeek];

    if (!daySchedule || !daySchedule.isActive) {
      return false;
    }

    // 3. Verificar que la hora esté dentro del rango de trabajo (parsear en UTC explícitamente)
    const requestedDateUTC = new Date(requestedTime);

    // Parsear horarios laborales en UTC (evitar parse() que usa timezone local)
    const [startHour, startMinute] = daySchedule.start.split(':').map(Number);
    const [endHour, endMinute] = daySchedule.end.split(':').map(Number);

    const workingHoursStart = new Date(requestedDateUTC);
    workingHoursStart.setUTCHours(startHour, startMinute, 0, 0);

    const workingHoursEnd = new Date(requestedDateUTC);
    workingHoursEnd.setUTCHours(endHour, endMinute, 0, 0);

    const serviceEndTime = addMinutes(requestedTime, serviceDuration);

    if (requestedTime < workingHoursStart || serviceEndTime > workingHoursEnd) {
      return false;
    }

    // 4. Obtener todos los conflictos potenciales del día (excluir canceladas)
    const bookingWhere: Record<string, unknown> = {
      adminId,
      bookingTime: {
        gte: dayStartUTC,
        lt: dayEndUTCExclusive
      },
      status: 'CONFIRMED'
    };
    if (excludeBookingId) {
      bookingWhere.id = { not: excludeBookingId };
    }

    const [bookings, blocks] = await Promise.all([
      db.booking.findMany({
        where: bookingWhere,
        select: {
          bookingTime: true,
          durationMinutes: true
        }
      }),
      db.availabilityBlock.findMany({
        where: {
          adminId,
          startTime: { lt: dayEndUTCExclusive },
          endTime: { gte: dayStartUTC }
        }
      })
    ]);

    // 5. Crear lista de períodos ocupados
    const busyPeriods: TimePeriod[] = [
      ...bookings.map(b => ({
        start: b.bookingTime,
        end: addMinutes(b.bookingTime, b.durationMinutes)
      })),
      ...blocks.map(b => ({
        start: b.startTime,
        end: b.endTime
      }))
    ];

    // 6. Verificar conflictos usando búsqueda binaria optimizada O(log n)
    const requestedPeriodEnd = addMinutes(requestedTime, serviceDuration);

    const hasConflict = hasTimeConflictOptimized(
      requestedTime,
      requestedPeriodEnd,
      busyPeriods
    );

    return !hasConflict;

  } catch (error) {
    logger.error({ error, serviceId, requestedTime, adminId }, 'Error validating time slot availability');
    throw error;
  }
};



/**
 * Crear una nueva reserva
 * Implementación mejorada con validaciones completas
 */
export const createBooking = async (
  clientId: string,
  data: CreateBookingDTO
): Promise<BookingWithDetails> => {
  try {
    const booking = await prisma.$transaction(
      async (tx) => {
        const client = await tx.client.findUnique({
          where: { id: clientId },
          select: { emailVerified: true, googleId: true }
        });

        if (!client) {
          throw buildBookingError(
            'Client not found',
            404,
            BookingErrorCodes.BOOKING_NOT_FOUND
          );
        }

        if (!client.emailVerified && !client.googleId) {
          throw buildBookingError(
            'Email not verified. Please verify your email before booking.',
            403,
            BookingErrorCodes.EMAIL_NOT_VERIFIED
          );
        }

        // 1. Verificar que el servicio existe y está activo
        const service = await tx.service.findUnique({
          where: { id: data.serviceId },
          include: {
            admin: {
              select: {
                id: true,
                minBookingAdvanceMinutes: true,
                schedule: true
              }
            }
          }
        });

        if (!service || !service.isActive) {
          throw buildBookingError(
            'Service not found or inactive',
            404,
            BookingErrorCodes.SERVICE_NOT_FOUND
          );
        }

        if (!service.admin) {
          throw buildBookingError(
            'Admin not found for this service',
            404,
            BookingErrorCodes.ADMIN_NOT_FOUND
          );
        }

        // 2. Validar tiempo mínimo de antelación (valida futuro + notice en una sola lógica)
        const now = new Date();
        const minNoticeMinutes = service.admin.minBookingAdvanceMinutes || 60; // Default 1 hora
        const minBookingTime = addMinutes(now, minNoticeMinutes);

        if (data.bookingTime < minBookingTime) {
          throw buildBookingError(
            `Booking must be made at least ${minNoticeMinutes} minutes in advance`,
            400,
            BookingErrorCodes.INSUFFICIENT_NOTICE
          );
        }

        // 3. Validar disponibilidad completa (horario de trabajo, conflictos, duración)
        const isAvailable = await validateTimeSlotAvailability(
          tx,
          data.bookingTime,
          service.durationMinutes,
          service.adminId,
          data.serviceId
        );

        if (!isAvailable) {
          throw buildBookingError(
            'The requested time slot is not available',
            409,
            BookingErrorCodes.UNAVAILABLE_TIME
          );
        }

        // 4. Crear la reserva con snapshot de duración
        return tx.booking.create({
          data: {
            clientId,
            serviceId: data.serviceId,
            adminId: service.adminId,
            bookingTime: data.bookingTime,
            durationMinutes: service.durationMinutes,
            notes: data.notes ?? null,
          },
          include: {
            service: {
              select: {
                id: true,
                name: true,
                durationMinutes: true,
                price: true
              }
            },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    logger.info({
      bookingId: booking.id,
      clientId,
      serviceId: data.serviceId,
      bookingTime: data.bookingTime,
      adminId: booking.adminId
    }, 'Booking created successfully with enhanced validation');

    return booking as BookingWithDetails;

  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2002' || error.code === 'P2034')
    ) {
      throw buildBookingError(
        'The requested time slot is not available',
        409,
        BookingErrorCodes.UNAVAILABLE_TIME
      );
    }

    logger.error({ error, clientId, data }, 'Error creating booking');
    throw error;
  }
};

/**
 * Obtener reservas de un cliente específico
 */
export const getClientBookings = async (
  clientId: string,
  filters: BookingFiltersDTO
): Promise<{ bookings: BookingWithDetails[]; total: number }> => {
  try {
    const where: Prisma.BookingWhereInput = {
      clientId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from || filters.to
        ? {
            bookingTime: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {})
            }
          }
        : {})
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          service: {
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              price: true
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: {
          bookingTime: 'desc'
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit
      }),
      prisma.booking.count({ where })
    ]);

    return { bookings: bookings as BookingWithDetails[], total };

  } catch (error) {
    logger.error({ error, clientId, filters }, 'Error getting client bookings');
    throw error;
  }
};

/**
 * Obtener todas las reservas (admin)
 */
export const getAdminBookings = async (
  adminId: string,
  filters: BookingFiltersDTO
): Promise<{ bookings: BookingWithDetails[]; total: number }> => {
  try {
    const where: Prisma.BookingWhereInput = {
      adminId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from || filters.to
        ? {
            bookingTime: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {})
            }
          }
        : {})
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          service: {
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              price: true
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: {
          bookingTime: 'asc'
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit
      }),
      prisma.booking.count({ where })
    ]);

    return { bookings: bookings as BookingWithDetails[], total };

  } catch (error) {
    logger.error({ error, adminId, filters }, 'Error getting admin bookings');
    throw error;
  }
};

/**
 * Cancelar una reserva (cliente)
 * Solo se puede cancelar si es futura
 */
export const cancelBooking = async (
  bookingId: string,
  clientId: string
): Promise<BookingWithDetails> => {
  try {
    const updatedBooking = await prisma.$transaction(
      async (tx) => {
        // 1. Buscar la reserva con detalles del admin
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: {
            admin: {
              select: {
                minCancellationNoticeMinutes: true
              }
            },
            service: {
              select: {
                id: true,
                name: true,
                durationMinutes: true,
                price: true
              }
            },
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                emailLanguage: true
              }
            }
          }
        });

        if (!booking) {
          throw buildBookingError(
            'Booking not found',
            404,
            BookingErrorCodes.BOOKING_NOT_FOUND
          );
        }

        // 2. Verificar pertenencia
        if (booking.clientId !== clientId) {
          throw buildBookingError(
            'Unauthorized to cancel this booking',
            403,
            BookingErrorCodes.UNAUTHORIZED
          );
        }

        // 3. Verificar que no esté ya cancelada
        if (booking.status === 'CANCELLED') {
          throw buildBookingError(
            'Booking is already cancelled',
            400,
            BookingErrorCodes.CANNOT_CANCEL
          );
        }

        // 4. Verificar tiempo mínimo de cancelación
        const now = new Date();
        const minCancellationNoticeMinutes = booking.admin.minCancellationNoticeMinutes || 120;
        const minCancellationTime = addMinutes(now, minCancellationNoticeMinutes);

        if (booking.bookingTime <= minCancellationTime) {
          const minutesRemaining = Math.floor(
            (booking.bookingTime.getTime() - now.getTime()) / 60000
          );
          throw buildBookingError(
            `Cannot cancel booking. Minimum cancellation notice is ${minCancellationNoticeMinutes} minutes. Time remaining: ${minutesRemaining} minutes.`,
            400,
            BookingErrorCodes.CANNOT_CANCEL
          );
        }

        // 5. Realizar soft delete actualizando el status
        return tx.booking.update({
          where: { id: bookingId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: 'CANCELLED_BY_CLIENT'
          },
          include: {
            service: {
              select: {
                id: true,
                name: true,
                durationMinutes: true,
                price: true
              }
            },
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                emailLanguage: true
              }
            }
          }
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    logger.info({
      bookingId,
      clientId,
      bookingTime: updatedBooking.bookingTime,
      status: updatedBooking.status
    }, 'Booking cancelled successfully');

    return updatedBooking as BookingWithDetails;

  } catch (error) {
    logger.error({ error, bookingId, clientId }, 'Error cancelling booking');
    throw error;
  }
};

/**
 * Obtener una reserva específica
 */
export const getBookingById = async (
  bookingId: string,
  clientId?: string
): Promise<BookingWithDetails> => {
  try {
    const where: Prisma.BookingWhereInput = {
      id: bookingId,
      ...(clientId ? { clientId } : {})
    };

    const booking = await prisma.booking.findFirst({
      where,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            price: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            emailLanguage: true
          }
        }
      }
    });

    if (!booking) {
      const error: BookingError = new Error('Booking not found') as BookingError;
      error.statusCode = 404;
      error.code = BookingErrorCodes.BOOKING_NOT_FOUND;
      throw error;
    }

    return booking as BookingWithDetails;

  } catch (error) {
    logger.error({ error, bookingId, clientId }, 'Error getting booking by id');
    throw error;
  }
};

interface CancelBookingByAdminParams {
  bookingId: string;
  adminId: string;
  reason?: string;
}

/**
 * Cancela una reserva como administrador (BKG-A-002).
 * El admin puede cancelar cualquier reserva sin restricción de tiempo de aviso.
 * El email de notificación al cliente se incluye en el resultado para que
 * el controller lo envíe asincrónicamente sin bloquear la respuesta.
 */
export const cancelBookingByAdmin = async (
  params: CancelBookingByAdminParams
): Promise<CancelBookingByAdminResult> => {
  const { bookingId, adminId, reason } = params;

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, adminId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            price: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            emailLanguage: true
          }
        }
      }
    });

    if (!booking) {
      const error: BookingError = new Error('Booking not found or not owned by this admin') as BookingError;
      error.statusCode = 404;
      error.code = BookingErrorCodes.BOOKING_NOT_FOUND;
      throw error;
    }

    if (booking.status === 'CANCELLED') {
      const error: BookingError = new Error('Booking is already cancelled') as BookingError;
      error.statusCode = 400;
      error.code = BookingErrorCodes.CANNOT_CANCEL;
      throw error;
    }

    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: 'CANCELLED_BY_ADMIN',
        notes: reason
          ? booking.notes
            ? `${booking.notes}\n\n[Admin cancel reason]: ${reason}`
            : `[Admin cancel reason]: ${reason}`
          : booking.notes
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            price: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            emailLanguage: true
          }
        }
      }
    });

    logger.info({
      bookingId,
      adminId,
      hasReason: Boolean(reason)
    }, 'Booking cancelled by admin');

    return {
      booking: updatedBooking as BookingWithDetails,
      clientEmail: booking.client.email,
      clientName: booking.client.name,
      clientLanguage: booking.client.emailLanguage,
      serviceName: booking.service.name,
      bookingTime: booking.bookingTime,
      durationMinutes: booking.service.durationMinutes
    };
  });
};

interface RescheduleBookingByAdminParams {
  bookingId: string;
  adminId: string;
  newBookingTime: Date;
}

/**
 * Reagenda una reserva como administrador (BKG-A-003).
 * El admin puede mover una reserva CONFIRMED a un nuevo slot sin restricción
 * de tiempo de aviso. La duración se preserva del snapshot. El email al cliente
 * incluye la hora anterior y la nueva hora para que vea el cambio claramente.
 */
export const rescheduleBookingByAdmin = async (
  params: RescheduleBookingByAdminParams
): Promise<RescheduleBookingByAdminResult> => {
  const { bookingId, adminId, newBookingTime } = params;

  if (isNaN(newBookingTime.getTime())) {
    const error: BookingError = new Error('Invalid new booking time') as BookingError;
    error.statusCode = 400;
    error.code = BookingErrorCodes.INVALID_INPUT;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, adminId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            price: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            emailLanguage: true
          }
        }
      }
    });

    if (!booking) {
      const error: BookingError = new Error('Booking not found or not owned by this admin') as BookingError;
      error.statusCode = 404;
      error.code = BookingErrorCodes.BOOKING_NOT_FOUND;
      throw error;
    }

    if (booking.status !== 'CONFIRMED') {
      const error: BookingError = new Error('Only confirmed bookings can be rescheduled') as BookingError;
      error.statusCode = 400;
      error.code = BookingErrorCodes.CANNOT_CANCEL;
      throw error;
    }

    const isSlotFree = await validateTimeSlotAvailability(
      tx,
      newBookingTime,
      booking.durationMinutes,
      adminId,
      booking.serviceId,
      bookingId
    );

    if (!isSlotFree) {
      const error: BookingError = new Error('The new time slot is not available') as BookingError;
      error.statusCode = 409;
      error.code = BookingErrorCodes.UNAVAILABLE_TIME;
      throw error;
    }

    const oldBookingTime = booking.bookingTime;

    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        bookingTime: newBookingTime
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            price: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            emailLanguage: true
          }
        }
      }
    });

    logger.info({
      bookingId,
      adminId,
      oldBookingTime: oldBookingTime.toISOString(),
      newBookingTime: newBookingTime.toISOString()
    }, 'Booking rescheduled by admin');

    return {
      booking: updatedBooking as BookingWithDetails,
      oldBookingTime,
      newBookingTime,
      clientEmail: booking.client.email,
      clientName: booking.client.name,
      clientLanguage: booking.client.emailLanguage,
      serviceName: booking.service.name,
      durationMinutes: booking.durationMinutes
    };
  });
};

const getUtcMonthRange = (year: number, month: number): { start: Date; endExclusive: Date } => {
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  return { start, endExclusive };
};

const sumServicePrices = (bookings: { service: { price: number } }[]): number =>
  bookings.reduce((sum, b) => sum + b.service.price, 0);

export const getBookingMetrics = async (adminId: string): Promise<BookingMetrics> => {
  const now = new Date();
  const today = getUtcDayRange(now);
  const yesterdayStart = new Date(today.start);
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
  const yesterdayRange = { start: yesterdayStart, endExclusive: today.start };
  const thisMonth = getUtcMonthRange(now.getUTCFullYear(), now.getUTCMonth());
  const lastMonth = getUtcMonthRange(now.getUTCFullYear(), now.getUTCMonth() - 1);
  const next7End = new Date(today.endExclusive);
  next7End.setUTCDate(next7End.getUTCDate() + 7);

  const baseWhere = { adminId };
  const confirmedWhere = { ...baseWhere, status: 'CONFIRMED' as const };

  const [
    todayCount, yesterdayCount,
    monthBookings, lastMonthBookings,
    activeServices, newClients,
    upcomingCount, totalCount, cancelledCount
  ] = await Promise.all([
    prisma.booking.count({ where: { ...confirmedWhere, bookingTime: { gte: today.start, lt: today.endExclusive } } }),
    prisma.booking.count({ where: { ...confirmedWhere, bookingTime: { gte: yesterdayRange.start, lt: yesterdayRange.endExclusive } } }),
    prisma.booking.findMany({ where: { ...confirmedWhere, bookingTime: { gte: thisMonth.start, lt: thisMonth.endExclusive } }, select: { service: { select: { price: true } } } }),
    prisma.booking.findMany({ where: { ...confirmedWhere, bookingTime: { gte: lastMonth.start, lt: lastMonth.endExclusive } }, select: { service: { select: { price: true } } } }),
    prisma.service.count({ where: { adminId, isActive: true } }),
    prisma.client.count({ where: { createdAt: { gte: thisMonth.start, lt: thisMonth.endExclusive } } }),
    prisma.booking.count({ where: { ...confirmedWhere, bookingTime: { gte: today.start, lt: next7End } } }),
    prisma.booking.count({ where: baseWhere }),
    prisma.booking.count({ where: { ...baseWhere, status: 'CANCELLED' as const } })
  ]);

  return {
    todayBookings: todayCount,
    yesterdayBookings: yesterdayCount,
    monthRevenue: sumServicePrices(monthBookings),
    lastMonthRevenue: sumServicePrices(lastMonthBookings),
    activeServices,
    newClientsThisMonth: newClients,
    upcomingBookings: upcomingCount,
    cancellationRate: totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) / 100 : 0
  };
};

export const createBookingByAdmin = async (
  adminId: string,
  data: { clientId: string; serviceId: string; bookingTime: Date }
): Promise<BookingWithDetails> => {
  const result = await prisma.$transaction(
    async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: data.clientId },
        select: { id: true, email: true, name: true, emailLanguage: true },
      });

      if (!client) {
        throw buildBookingError(
          'Client not found',
          404,
          BookingErrorCodes.BOOKING_NOT_FOUND
        );
      }

      const service = await tx.service.findUnique({
        where: { id: data.serviceId },
        include: {
          admin: {
            select: { id: true, schedule: true },
          },
        },
      });

      if (!service || !service.isActive) {
        throw buildBookingError(
          'Service not found or inactive',
          404,
          BookingErrorCodes.SERVICE_NOT_FOUND
        );
      }

      if (!service.admin || service.admin.id !== adminId) {
        throw buildBookingError(
          'Service does not belong to this admin',
          403,
          BookingErrorCodes.UNAUTHORIZED
        );
      }

      const isAvailable = await validateTimeSlotAvailability(
        tx,
        data.bookingTime,
        service.durationMinutes,
        adminId,
        data.serviceId
      );

      if (!isAvailable) {
        throw buildBookingError(
          'The requested time slot is not available',
          409,
          BookingErrorCodes.UNAVAILABLE_TIME
        );
      }

      const booking = await tx.booking.create({
        data: {
          clientId: data.clientId,
          serviceId: data.serviceId,
          adminId,
          bookingTime: data.bookingTime,
          durationMinutes: service.durationMinutes,
        },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              price: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return booking;
    },
    {
      isolationLevel: 'Serializable',
    }
  );

  return result;
};