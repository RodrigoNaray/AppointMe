import  prisma from '../../config/prisma'
import { 
  CreateBookingDTO, 
  BookingFiltersDTO, 
  BookingWithDetails,
  BookingError,
  BookingErrorCodes 
} from './booking.types';
import logger from '../../utils/logger';



/**
 * Crear una nueva reserva
 * Implementación básica MVP - validaciones mínimas
 */
export const createBooking = async (
  clientId: string,
  data: CreateBookingDTO
): Promise<BookingWithDetails> => {
  try {
    // 1. Verificar que el servicio existe y está activo
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      include: { admin: true }
    });

    if (!service || !service.isActive) {
      const error: BookingError = new Error('Service not found or inactive') as BookingError;
      error.statusCode = 404;
      error.code = BookingErrorCodes.SERVICE_NOT_FOUND;
      throw error;
    }

    // 2. Validación básica de tiempo (debe ser futuro)
    const now = new Date();
    if (data.bookingTime <= now) {
      const error: BookingError = new Error('Booking time must be in the future') as BookingError;
      error.statusCode = 400;
      error.code = BookingErrorCodes.INVALID_TIME_RANGE;
      throw error;
    }

    // 3. Verificar conflictos de horario (básico)
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        serviceId: data.serviceId,
        bookingTime: data.bookingTime,
      }
    });

    if (conflictingBooking) {
      const error: BookingError = new Error('Time slot not available') as BookingError;
      error.statusCode = 409;
      error.code = BookingErrorCodes.UNAVAILABLE_TIME;
      throw error;
    }

    // 4. Crear la reserva
    const booking = await prisma.booking.create({
      data: {
        clientId,
        serviceId: data.serviceId,
        adminId: service.adminId,
        bookingTime: data.bookingTime,
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
      bookingTime: data.bookingTime
    }, 'Booking created successfully');

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