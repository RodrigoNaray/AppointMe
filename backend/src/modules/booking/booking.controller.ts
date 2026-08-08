import { Response } from 'express';
import { AdminUser, Client } from '@prisma/client';
import {
  CreateBookingRequest,
  GetBookingsRequest,
  GetBookingMetricsRequest,
  CancelBookingRequest,
  CancelBookingByAdminRequest,
  RescheduleBookingRequest,
  CreateBookingByAdminRequest,
  CreateBookingResponse,
  GetBookingsResponse,
  BookingError,
  BookingWithDetails,
  BookingMetrics
} from './booking.types';
import * as service from './booking.services'
import logger from '../../utils/logger';
import { sendBookingConfirmationEmail, sendAdminCancellationEmail, sendBookingRescheduledEmail, sendClientCancellationEmail } from '../../services/emailService';

const DEFAULT_CLIENT_TIMEZONE = 'America/Montevideo';

const isValidTimeZone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

const resolveClientTimezone = (timezone?: string): string =>
  timezone && isValidTimeZone(timezone) ? timezone : DEFAULT_CLIENT_TIMEZONE;

const MAX_PAGE_SIZE = 100;

const parsePagination = (page?: string, limit?: string): { page: number; limit: number } => {
  const parsedPage = Number(page);
  const parsedLimit = Number(limit);
  const validPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const validLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_PAGE_SIZE) : 10;
  return { page: validPage, limit: validLimit };
};

/**
 * Crear una nueva reserva (Cliente)
 * POST /api/bookings
 */
export const createBooking = async (
  req: CreateBookingRequest,
  res: Response<CreateBookingResponse>
) => {
  try {
    // Usamos req.user, que ahora está tipado gracias a express.d.ts
    const client = req.user as Client;
    if (!client?.id) {
      return res.status(401).json({
        success: false,
        booking: undefined,
        message: 'Autenticación requerida'
      });
    }

    const { serviceId, bookingTime, notes, clientTimezone } = req.body;

    // Validaciones básicas (timezone es REQUERIDO)
    if (!serviceId || !bookingTime || !clientTimezone) {
      return res.status(400).json({
        success: false,
        booking: undefined,
        message: 'Se requieren serviceId, bookingTime y clientTimezone'
      });
    }

    const bookingTimeDate = new Date(bookingTime);
    if (isNaN(bookingTimeDate.getTime())) {
      return res.status(400).json({
        success: false,
        booking: undefined,
        message: 'Formato de fecha y hora de reserva inválido'
      });
    }

    const booking = await service.createBooking(client.id, {
      serviceId,
      bookingTime: bookingTimeDate,
      notes,
      clientTimezone
    });

    logger.info({
      bookingId: booking.id,
      clientId: client.id,
      serviceId
    }, 'Booking created via API');

    // Enviar email de confirmación (async, no bloquear respuesta)
    sendBookingConfirmationEmail({
      to: client.email,
      clientName: client.name,
      clientTimezone,
      clientLanguage: client.emailLanguage,
      bookings: [{
        serviceName: booking.service.name,
        bookingTime: booking.bookingTime,
        durationMinutes: booking.durationMinutes
      }]
    }).catch(error => {
      // Log error pero no fallar la petición (email es secundario)
      logger.error({ error, bookingId: booking.id }, 'Failed to send booking confirmation email');
    });

    return res.status(201).json({
      success: true,
      booking,
      message: 'Reserva creada exitosamente'
    });

  } catch (error) {
    logger.error({ error }, 'Error in createBookingController');

    if (error instanceof Error && 'statusCode' in error) {
      const bookingError = error as BookingError;
      return res.status(bookingError.statusCode).json({
        success: false,
        booking: undefined,
        message: bookingError.message
      });
    }

    return res.status(500).json({
      success: false,
      booking: undefined,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener reservas del cliente autenticado
 * GET /api/bookings/my
 */
export const getMyBookings = async (
  req: GetBookingsRequest,
  res: Response<GetBookingsResponse>
) => {
  try {
    const client = req.user as Client;
    if (!client?.id) {
      return res.status(401).json({
        success: false,
        bookings: [],
        pagination: { current_page: 1, total_pages: 0, total_count: 0, per_page: 10 }
      });
    }

    const { page, limit } = parsePagination(req.query.page, req.query.limit);
    const from = req.query.from ? new Date(req.query.from) : undefined;
    const to = req.query.to ? new Date(req.query.to) : undefined;

    const { bookings, total } = await service.getClientBookings(client.id, {
      from,
      to,
      page,
      limit
    });

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      bookings,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_count: total,
        per_page: limit
      }
    });

  } catch (error) {
    logger.error({ error, query: req.query }, 'Error in getMyBookingsController');

    return res.status(500).json({
      success: false,
      bookings: [],
      pagination: { current_page: 1, total_pages: 0, total_count: 0, per_page: 10 }
    });
  }
};

/**
 * Cancelar una reserva (Cliente)
 * PUT /api/bookings/:id/cancel
 * Nota: PUT en vez de PATCH para mejor compatibilidad CORS/proxies
 */
export const cancelBooking = async (
  req: CancelBookingRequest,
  res: Response<{ success: boolean; message: string; booking?: BookingWithDetails }>
) => {
  try {
    const client = req.user as Client;
    if (!client?.id) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida'
      });
    }

    const { id } = req.params;

    const updatedBooking = await service.cancelBooking(id, client.id);

    logger.info({
      bookingId: id,
      clientId: client.id
    }, 'Booking cancelled via API');

    sendClientCancellationEmail({
      to: client.email,
      clientName: client.name,
      clientTimezone: resolveClientTimezone(updatedBooking.clientTimezone ?? req.body?.clientTimezone),
      clientLanguage: client.emailLanguage,
      serviceName: updatedBooking.service?.name || 'Servicio',
      bookingTime: updatedBooking.bookingTime,
      durationMinutes: updatedBooking.durationMinutes,
    }).catch((error) => {
      logger.error({ error, bookingId: id }, 'Failed to send client cancellation email');
    });

    return res.status(200).json({
      success: true,
      message: 'Reserva cancelada exitosamente',
      booking: updatedBooking
    });

  } catch (error) {
    logger.error({ error, params: req.params }, 'Error in cancelBookingController');

    if (error instanceof Error && 'statusCode' in error) {
      const bookingError = error as BookingError;
      return res.status(bookingError.statusCode).json({
        success: false,
        message: bookingError.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Cancelar una reserva (Admin) - BKG-A-002
 * PUT /api/admin/bookings/:id/cancel
 */
export const cancelBookingByAdminController = async (
  req: CancelBookingByAdminRequest,
  res: Response<{ success: boolean; message: string; booking?: BookingWithDetails }>
) => {
  try {
    const admin = req.user as AdminUser;
    if (!admin?.id) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida'
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500)) {
      return res.status(400).json({
        success: false,
        message: 'El motivo debe ser un texto de máximo 500 caracteres'
      });
    }

    const result = await service.cancelBookingByAdmin({
      bookingId: id,
      adminId: admin.id,
      reason
    });

    logger.info({
      bookingId: id,
      adminId: admin.id,
      hasReason: Boolean(reason)
    }, 'Booking cancelled by admin via API');

    const clientTimezone = result.booking.clientTimezone ?? DEFAULT_CLIENT_TIMEZONE;

    sendAdminCancellationEmail({
      to: result.clientEmail,
      clientName: result.clientName,
      clientTimezone,
      clientLanguage: result.clientLanguage,
      serviceName: result.serviceName,
      bookingTime: result.bookingTime,
      durationMinutes: result.durationMinutes,
      reason
    }).catch((error) => {
      logger.error(
        { error, bookingId: id, clientId: result.booking.clientId },
        'Failed to send admin cancellation email'
      );
    });

    return res.status(200).json({
      success: true,
      message: 'Reserva cancelada exitosamente',
      booking: result.booking
    });

  } catch (error) {
    logger.error({ error }, 'Error in cancelBookingByAdminController');

    if (error instanceof Error && 'statusCode' in error) {
      const bookingError = error as BookingError;
      return res.status(bookingError.statusCode).json({
        success: false,
        message: bookingError.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Reagendar una reserva (Admin) - BKG-A-003
 * PUT /api/admin/bookings/:id/reschedule
 */
export const rescheduleBookingByAdminController = async (
  req: RescheduleBookingRequest,
  res: Response<{ success: boolean; message: string; booking?: BookingWithDetails }>
) => {
  try {
    const admin = req.user as AdminUser;
    if (!admin?.id) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida'
      });
    }

    const { id } = req.params;
    const { newBookingTime } = req.body;

    if (!newBookingTime) {
      return res.status(400).json({
        success: false,
        message: 'newBookingTime es requerido'
      });
    }

    const newBookingTimeDate = new Date(newBookingTime);
    if (isNaN(newBookingTimeDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Formato de newBookingTime inválido'
      });
    }

    const result = await service.rescheduleBookingByAdmin({
      bookingId: id,
      adminId: admin.id,
      newBookingTime: newBookingTimeDate
    });

    logger.info({
      bookingId: id,
      adminId: admin.id,
      oldBookingTime: result.oldBookingTime.toISOString(),
      newBookingTime: result.newBookingTime.toISOString()
    }, 'Booking rescheduled by admin via API');

    const clientTimezone = result.booking.clientTimezone ?? DEFAULT_CLIENT_TIMEZONE;

    sendBookingRescheduledEmail({
      to: result.clientEmail,
      clientName: result.clientName,
      clientTimezone,
      clientLanguage: result.clientLanguage,
      serviceName: result.serviceName,
      oldBookingTime: result.oldBookingTime,
      newBookingTime: result.newBookingTime,
      durationMinutes: result.durationMinutes
    }).catch((error) => {
      logger.error(
        { error, bookingId: id, clientId: result.booking.clientId },
        'Failed to send booking rescheduled email'
      );
    });

    return res.status(200).json({
      success: true,
      message: 'Reserva reagendada exitosamente',
      booking: result.booking
    });

  } catch (error) {
    logger.error({ error }, 'Error in rescheduleBookingByAdminController');

    if (error instanceof Error && 'statusCode' in error) {
      const bookingError = error as BookingError;
      return res.status(bookingError.statusCode).json({
        success: false,
        message: bookingError.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener todas las reservas (Admin)
 * GET /api/admin/bookings
 */
export const getAllBookings = async (
  req: GetBookingsRequest,
  res: Response<GetBookingsResponse>
) => {
  try {
    // @ts-ignore - adminId viene del middleware de autenticación admin
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        bookings: [],
        pagination: { current_page: 1, total_pages: 0, total_count: 0, per_page: 10 }
      });
    }

    const { page, limit } = parsePagination(req.query.page, req.query.limit);
    const from = req.query.from ? new Date(req.query.from) : undefined;
    const to = req.query.to ? new Date(req.query.to) : undefined;
    const sort = req.query.sort === 'asc' ? 'asc' : 'desc';

    const { bookings, total } = await service.getAdminBookings(adminId, {
      from,
      to,
      page,
      limit,
      sort
    });

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      bookings,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_count: total,
        per_page: limit
      }
    });

  } catch (error) {
    logger.error({ error, query: req.query }, 'Error in getAllBookingsController');

    return res.status(500).json({
      success: false,
      bookings: [],
      pagination: { current_page: 1, total_pages: 0, total_count: 0, per_page: 10 }
    });
  }
};

export const getBookingMetricsController = async (
  req: GetBookingMetricsRequest,
  res: Response<{ success: boolean; metrics: BookingMetrics }>
) => {
  try {
    const adminId = (req.user as AdminUser)?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, metrics: {} as BookingMetrics });
    }

    const metrics = await service.getBookingMetrics(adminId);

    return res.status(200).json({ success: true, metrics });
  } catch (error) {
    logger.error({ error }, 'Error in getBookingMetricsController');

    return res.status(500).json({ success: false, metrics: {} as BookingMetrics });
  }
};

/**
 * Obtener una reserva específica (Cliente o Admin)
 * GET /api/bookings/:id
 */
export const getBookingById = async (
  req: GetBookingsRequest,
  res: Response<{ success: boolean; booking?: BookingWithDetails; message: string }>
) => {
  try {
    const { id } = req.params;
    const client = req.user as Client;

    const booking = await service.getBookingById(id, client.id);

    return res.status(200).json({
      success: true,
      booking,
      message: 'Reserva obtenida exitosamente'
    });

  } catch (error) {
    logger.error({ error, params: req.params }, 'Error in getBookingByIdController');

    if (error instanceof Error && 'statusCode' in error) {
      const bookingError = error as BookingError;
      return res.status(bookingError.statusCode).json({
        success: false,
        message: bookingError.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

export const createBookingByAdminController = async (
  req: CreateBookingByAdminRequest,
  res: Response<CreateBookingResponse>
) => {
  try {
    const admin = req.user as AdminUser;
    if (!admin?.id) {
      return res.status(401).json({ success: false, message: 'Autenticación requerida' });
    }

    const { clientId, serviceId, bookingTime } = req.body;

    if (!clientId || !serviceId || !bookingTime) {
      return res.status(400).json({
        success: false,
        message: 'clientId, serviceId y bookingTime son requeridos',
      });
    }

    const bookingTimeDate = new Date(bookingTime);
    if (isNaN(bookingTimeDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha y hora de reserva inválido',
      });
    }

    const booking = await service.createBookingByAdmin(admin.id, {
      clientId,
      serviceId,
      bookingTime: bookingTimeDate,
    });

    logger.info({
      bookingId: booking.id,
      adminId: admin.id,
      clientId,
      serviceId,
    }, 'Booking created by admin');

    sendBookingConfirmationEmail({
      to: booking.client.email,
      clientName: booking.client.name,
      clientTimezone: DEFAULT_CLIENT_TIMEZONE,
      clientLanguage: booking.client.emailLanguage,
      bookings: [{
        serviceName: booking.service.name,
        bookingTime: booking.bookingTime,
        durationMinutes: booking.durationMinutes,
      }],
    }).catch((error) => {
      logger.error({ error, bookingId: booking.id }, 'Failed to send admin-created booking email');
    });

    return res.status(201).json({
      success: true,
      booking,
      message: 'Reserva creada exitosamente',
    });
  } catch (error) {
    logger.error({ error }, 'Error in createBookingByAdminController');

    if (error instanceof Error && 'statusCode' in error) {
      const bookingError = error as BookingError;
      return res.status(bookingError.statusCode).json({
        success: false,
        message: bookingError.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};