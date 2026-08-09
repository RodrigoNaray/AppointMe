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

    // 2. Verificar que esté dentro del horario de trabajo (parsear en UTC explícitamente)
    const dayOfWeekIndex = requestedTime.getUTCDay();
    const dayOfWeek = dayMap[dayOfWeekIndex];
    const schedule = adminUser.schedule as unknown as WeeklySchedule;
    const daySchedule = schedule[dayOfWeek];

    const requestedDateUTC = new Date(requestedTime);
    const serviceEndTime = addMinutes(requestedTime, serviceDuration);

    const isInsideWindow = (
      dayData: { start: string; end: string; isActive: boolean } | undefined,
      windowDate: Date
    ): boolean => {
      if (!dayData?.isActive) return false;
      const [startHour, startMinute] = dayData.start.split(':').map(Number);
      const [endHour, endMinute] = dayData.end.split(':').map(Number);

      const windowStart = new Date(windowDate);
      windowStart.setUTCHours(startHour, startMinute, 0, 0);

      const windowEnd = new Date(windowDate);
      windowEnd.setUTCHours(endHour, endMinute, 0, 0);

      // Ventanas que cruzan medianoche (ej: 20:00-02:00): el final pertenece al día siguiente
      if (windowEnd <= windowStart) {
        windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);
      }

      return requestedTime >= windowStart && serviceEndTime <= windowEnd;
    };

    const inOwnWindow = isInsideWindow(daySchedule, requestedDateUTC);

    // Madrugada: el slot puede pertenecer a la ventana del día anterior si esta cruza medianoche
    const previousDay = new Date(requestedDateUTC);
    previousDay.setUTCDate(previousDay.getUTCDate() - 1);
    const inPreviousWindow = isInsideWindow(schedule[dayMap[previousDay.getUTCDay()]], previousDay);

    if (!inOwnWindow && !inPreviousWindow) {
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
            'Cliente no encontrado',
            404,
            BookingErrorCodes.BOOKING_NOT_FOUND
          );
        }

        if (!client.emailVerified && !client.googleId) {
          throw buildBookingError(
            'Email no verificado. Verificá tu email antes de reservar.',
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
            'Servicio no encontrado o inactivo',
            404,
            BookingErrorCodes.SERVICE_NOT_FOUND
          );
        }

        if (!service.admin) {
          throw buildBookingError(
            'Administrador no encontrado para este servicio',
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
            `La reserva debe hacerse con al menos ${minNoticeMinutes} minutos de antelación`,
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
            'El horario solicitado no está disponible',
            409,
            BookingErrorCodes.UNAVAILABLE_TIME
          );
        }

        // 4. Crear la reserva con snapshot de duración
        return tx.booking.create({
          data: {
            clientId,
            serviceId: data.serviceId,
            adminId: service.admin.id,
            bookingTime: data.bookingTime,
            durationMinutes: service.durationMinutes,
            notes: data.notes ?? null,
            clientTimezone: data.clientTimezone,
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
        'El horario solicitado no está disponible',
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
          bookingTime: filters.sort === 'asc' ? 'asc' : 'desc'
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
            'Reserva no encontrada',
            404,
            BookingErrorCodes.BOOKING_NOT_FOUND
          );
        }

        // 2. Verificar pertenencia
        if (booking.clientId !== clientId) {
          throw buildBookingError(
            'No autorizado para cancelar esta reserva',
            403,
            BookingErrorCodes.UNAUTHORIZED
          );
        }

        // 3. Verificar que no esté ya cancelada
        if (booking.status === 'CANCELLED') {
          throw buildBookingError(
            'La reserva ya está cancelada',
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
            `No se puede cancelar: el aviso mínimo es de ${minCancellationNoticeMinutes} minutos. Tiempo restante: ${minutesRemaining} minutos.`,
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
      const error: BookingError = new Error('Reserva no encontrada') as BookingError;
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
      const error: BookingError = new Error('Reserva no encontrada o no pertenece a este administrador') as BookingError;
      error.statusCode = 404;
      error.code = BookingErrorCodes.BOOKING_NOT_FOUND;
      throw error;
    }

    if (booking.status === 'CANCELLED') {
      const error: BookingError = new Error('La reserva ya está cancelada') as BookingError;
      error.statusCode = 400;
      error.code = BookingErrorCodes.CANNOT_CANCEL;
      throw error;
    }

    if (booking.bookingTime <= new Date()) {
      const error: BookingError = new Error(
        'La reserva ya comenzó o finalizó y no puede cancelarse'
      ) as BookingError;
      error.statusCode = 400;
      error.code = BookingErrorCodes.BOOKING_ALREADY_PASSED;
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
    const error: BookingError = new Error('Fecha y hora de reserva inválidas') as BookingError;
    error.statusCode = 400;
    error.code = BookingErrorCodes.INVALID_INPUT;
    throw error;
  }

  let result;
  try {
  result = await prisma.$transaction(async (tx) => {
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
      const error: BookingError = new Error('Reserva no encontrada o no pertenece a este administrador') as BookingError;
      error.statusCode = 404;
      error.code = BookingErrorCodes.BOOKING_NOT_FOUND;
      throw error;
    }

    if (booking.status !== 'CONFIRMED') {
      const error: BookingError = new Error('Solo se pueden reprogramar reservas confirmadas') as BookingError;
      error.statusCode = 400;
      error.code = BookingErrorCodes.CANNOT_CANCEL;
      throw error;
    }

    if (booking.bookingTime <= new Date()) {
      const error: BookingError = new Error(
        'La reserva ya comenzó o finalizó y no puede reprogramarse'
      ) as BookingError;
      error.statusCode = 400;
      error.code = BookingErrorCodes.BOOKING_ALREADY_PASSED;
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
      const error: BookingError = new Error('El nuevo horario no está disponible') as BookingError;
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
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2002' || error.code === 'P2034')
    ) {
      throw buildBookingError(
        'El nuevo horario no está disponible',
        409,
        BookingErrorCodes.UNAVAILABLE_TIME
      );
    }
    throw error;
  }

  return result;
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
  let result;
  try {
  result = await prisma.$transaction(
    async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: data.clientId },
        select: { id: true, email: true, name: true, emailLanguage: true },
      });

      if (!client) {
        throw buildBookingError(
          'Cliente no encontrado',
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
          'Servicio no encontrado o inactivo',
          404,
          BookingErrorCodes.SERVICE_NOT_FOUND
        );
      }

      if (!service.admin || service.admin.id !== adminId) {
        throw buildBookingError(
          'El servicio no pertenece a este administrador',
          403,
          BookingErrorCodes.UNAUTHORIZED
        );
      }

      if (data.bookingTime <= new Date()) {
        throw buildBookingError(
          'La reserva no puede crearse en una fecha u hora pasada',
          400,
          BookingErrorCodes.BOOKING_ALREADY_PASSED
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
          'El horario solicitado no está disponible',
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
              emailLanguage: true,
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2002' || error.code === 'P2034')
    ) {
      throw buildBookingError(
        'El horario solicitado no está disponible',
        409,
        BookingErrorCodes.UNAVAILABLE_TIME
      );
    }
    throw error;
  }

  return result;
};