import  prisma from '../../config/prisma'
import { 
  CreateBookingDTO, 
  BookingFiltersDTO, 
  BookingWithDetails,
  BookingError,
  BookingErrorCodes 
} from './booking.types';
import { addMinutes, format, startOfDay, endOfDay, parse } from 'date-fns';
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

/**
 * Valida si una hora específica está disponible para una reserva
 */
const validateTimeSlotAvailability = async (
  serviceId: string,
  requestedTime: Date,
  serviceDuration: number,
  adminId: string
): Promise<boolean> => {
  try {
    // 1. Obtener el admin y su horario
    const adminUser = await prisma.adminUser.findUnique({
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

    // 4. Obtener todos los conflictos potenciales del día
    const [bookings, blocks] = await Promise.all([
      prisma.booking.findMany({
        where: {
          adminId,
          bookingTime: {
            gte: startOfDay(requestedTime),
            lte: endOfDay(requestedTime)
          }
        },
        include: {
          service: {
            select: { durationMinutes: true }
          }
        }
      }),
      prisma.availabilityBlock.findMany({
        where: {
          adminId,
          startTime: { lte: endOfDay(requestedTime) },
          endTime: { gte: startOfDay(requestedTime) }
        }
      })
    ]);

    // 5. Crear lista de períodos ocupados
    const busyPeriods: TimePeriod[] = [
      ...bookings.map(b => ({
        start: b.bookingTime,
        end: addMinutes(b.bookingTime, b.service.durationMinutes)
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
    // 1. Verificar que el servicio existe y está activo
    const service = await prisma.service.findUnique({
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
      const error: BookingError = new Error('Service not found or inactive') as BookingError;
      error.statusCode = 404;
      error.code = BookingErrorCodes.SERVICE_NOT_FOUND;
      throw error;
    }

    if (!service.admin) {
      const error: BookingError = new Error('Admin not found for this service') as BookingError;
      error.statusCode = 404;
      error.code = BookingErrorCodes.ADMIN_NOT_FOUND;
      throw error;
    }

    // 2. Validar tiempo mínimo de antelación (valida futuro + notice en una sola lógica)
    const now = new Date();
    const minNoticeMinutes = service.admin.minBookingNoticeMinutes || 60; // Default 1 hora
    const minBookingTime = addMinutes(now, minNoticeMinutes);
    
    if (data.bookingTime < minBookingTime) {
      const error: BookingError = new Error(
        `Booking must be made at least ${minNoticeMinutes} minutes in advance`
      ) as BookingError;
      error.statusCode = 400;
      error.code = BookingErrorCodes.INSUFFICIENT_NOTICE;
      throw error;
    }

    // 4. Validar disponibilidad completa (horario de trabajo, conflictos, duración)
    const isAvailable = await validateTimeSlotAvailability(
      data.serviceId,
      data.bookingTime,
      service.durationMinutes,
      service.adminId
    );

    if (!isAvailable) {
      const error: BookingError = new Error('The requested time slot is not available') as BookingError;
      error.statusCode = 409;
      error.code = BookingErrorCodes.UNAVAILABLE_TIME;
      throw error;
    }

    // 5. Crear la reserva con snapshot de duración
    const booking = await prisma.booking.create({
      data: {
        clientId,
        serviceId: data.serviceId,
        adminId: service.adminId,
        bookingTime: data.bookingTime,
        durationMinutes: service.durationMinutes, // Snapshot de duración al momento de reservar
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
      bookingId: booking.id,
      clientId,
      serviceId: data.serviceId,
      bookingTime: data.bookingTime,
      adminId: service.adminId
    }, 'Booking created successfully with enhanced validation');

    return booking as BookingWithDetails;

  } catch (error) {
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
    const where: any = {
      clientId
    };

    // Filtros de fecha
    if (filters.from || filters.to) {
      where.bookingTime = {};
      if (filters.from) {
        where.bookingTime.gte = filters.from;
      }
      if (filters.to) {
        where.bookingTime.lte = filters.to;
      }
    }

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
    const where: any = {
      adminId
    };

    // Filtros de fecha
    if (filters.from || filters.to) {
      where.bookingTime = {};
      if (filters.from) {
        where.bookingTime.gte = filters.from;
      }
      if (filters.to) {
        where.bookingTime.lte = filters.to;
      }
    }

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
): Promise<void> => {
  try {
    // 1. Buscar la reserva
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
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

    // 3. Verificar que sea futura
    const now = new Date();
    if (booking.bookingTime <= now) {
      const error: BookingError = new Error('Cannot cancel past bookings') as BookingError;
      error.statusCode = 400;
      error.code = BookingErrorCodes.CANNOT_CANCEL;
      throw error;
    }

    // 4. Eliminar la reserva (implementación simple)
    await prisma.booking.delete({
      where: { id: bookingId }
    });

    logger.info({
      bookingId,
      clientId
    }, 'Booking cancelled successfully');

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
    const where: any = { id: bookingId };
    
    // Si se especifica clientId, filtrar por cliente
    if (clientId) {
      where.clientId = clientId;
    }

    const booking = await prisma.booking.findUnique({
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