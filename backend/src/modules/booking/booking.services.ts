import prisma from '../../config/prisma'
import { Prisma } from '@prisma/client';
import { 
  CreateBookingDTO, 
  BookingFiltersDTO, 
  BookingWithDetails,
  BookingError,
  BookingErrorCodes 
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
  serviceId: string
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
    const [bookings, blocks] = await Promise.all([
      db.booking.findMany({
        where: {
          adminId,
          bookingTime: {
            gte: dayStartUTC,
            lt: dayEndUTCExclusive
          },
          status: 'CONFIRMED' // Solo considerar reservas confirmadas para conflictos
        },
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
    return false;
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
        // 1. Verificar que el servicio existe y está activo
        const service = await tx.service.findUnique({
          where: { id: data.serviceId },
          include: {
            admin: {
              select: {
                id: true,
                minBookingNoticeMinutes: true,
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
        const minNoticeMinutes = service.admin.minBookingNoticeMinutes || 60; // Default 1 hora
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
                phone: true
              }
            }
          }
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      }
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
    // 1. Buscar la reserva con detalles del admin
    const booking = await prisma.booking.findUnique({
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
            phone: true
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

    // 2. Verificar pertenencia
    if (booking.clientId !== clientId) {
      const error: BookingError = new Error('Unauthorized to cancel this booking') as BookingError;
      error.statusCode = 403;
      error.code = BookingErrorCodes.UNAUTHORIZED;
      throw error;
    }

    // 3. Verificar que no esté ya cancelada
    if (booking.status === 'CANCELLED') {
      const error: BookingError = new Error('Booking is already cancelled') as BookingError;
      error.statusCode = 400;
      error.code = BookingErrorCodes.CANNOT_CANCEL;
      throw error;
    }

    // 4. Verificar tiempo mínimo de cancelación
    const now = new Date();
    const minCancellationNoticeMinutes = booking.admin.minCancellationNoticeMinutes || 120; // Default 2 horas
    const minCancellationTime = addMinutes(now, minCancellationNoticeMinutes);
    
    if (booking.bookingTime <= minCancellationTime) {
      const minutesRemaining = Math.floor((booking.bookingTime.getTime() - now.getTime()) / 60000);
      const error: BookingError = new Error(
        `Cannot cancel booking. Minimum cancellation notice is ${minCancellationNoticeMinutes} minutes. Time remaining: ${minutesRemaining} minutes.`
      ) as BookingError;
      error.statusCode = 400;
      error.code = BookingErrorCodes.CANNOT_CANCEL;
      throw error;
    }

    // 5. Realizar soft delete actualizando el status
    const updatedBooking = await prisma.booking.update({
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
            phone: true
          }
        }
      }
    });

    logger.info({
      bookingId,
      clientId,
      bookingTime: booking.bookingTime,
      minCancellationNoticeMinutes
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
            phone: true
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