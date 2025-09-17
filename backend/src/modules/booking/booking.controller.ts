import { Response } from 'express';
import {
  CreateBookingRequest,
  GetBookingsRequest,
  CancelBookingRequest,
  CreateBookingResponse,
  GetBookingsResponse,
  BookingError
} from './booking.types';
import {
  createBooking,
  getClientBookings,
  getAdminBookings,
  cancelBooking,
  getBookingById
} from './booking.services';
import logger from '../../utils/logger';

/**
 * Crear una nueva reserva (Cliente)
 * POST /api/bookings
 */
export const createBookingController = async (
  req: CreateBookingRequest,
  res: Response<CreateBookingResponse>
) => {
  try {
    const clientId = req.client?.id;
    if (!clientId) {
      return res.status(401).json({
        success: false,
        booking: undefined as any,
        message: 'Authentication required'
      });
    }

    const { serviceId, bookingTime, notes } = req.body;

    // Validaciones básicas
    if (!serviceId || !bookingTime) {
      return res.status(400).json({
        success: false,
        booking: undefined as any,
        message: 'Service ID and booking time are required'
      });
    }

    const bookingTimeDate = new Date(bookingTime);
    if (isNaN(bookingTimeDate.getTime())) {
      return res.status(400).json({
        success: false,
        booking: undefined as any,
        message: 'Invalid booking time format'
      });
    }

    const booking = await createBooking(clientId, {
      serviceId,
      bookingTime: bookingTimeDate,
      notes
    });

    logger.info({
      bookingId: booking.id,
      clientId,
      serviceId
    }, 'Booking created via API');

    return res.status(201).json({
      success: true,
      booking,
      message: 'Booking created successfully'
    });

  } catch (error) {
    logger.error({ error, body: req.body }, 'Error in createBookingController');

    if (error instanceof Error && 'statusCode' in error) {
      const bookingError = error as BookingError;
      return res.status(bookingError.statusCode).json({
        success: false,
        booking: undefined as any,
        message: bookingError.message
      });
    }

    return res.status(500).json({
      success: false,
      booking: undefined as any,
      message: 'Internal server error'
    });
  }
};

/**
 * Obtener reservas del cliente autenticado
 * GET /api/bookings/my
 */
export const getMyBookingsController = async (
  req: GetBookingsRequest,
  res: Response<GetBookingsResponse>
) => {
  try {
    const clientId = req.client?.id;
    if (!clientId) {
      return res.status(401).json({
        success: false,
        bookings: [],
        pagination: { current_page: 1, total_pages: 0, total_count: 0, per_page: 10 }
      });
    }

    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const from = req.query.from ? new Date(req.query.from) : undefined;
    const to = req.query.to ? new Date(req.query.to) : undefined;

    const { bookings, total } = await getClientBookings(clientId, {
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
 * PATCH /api/bookings/:id/cancel
 */
export const cancelBookingController = async (
  req: CancelBookingRequest,
  res: Response<{ success: boolean; message: string }>
) => {
  try {
    const clientId = req.client?.id;
    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { id } = req.params;

    await cancelBooking(id, clientId);

    logger.info({
      bookingId: id,
      clientId
    }, 'Booking cancelled via API');

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully'
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
      message: 'Internal server error'
    });
  }
};

/**
 * Obtener todas las reservas (Admin)
 * GET /api/admin/bookings
 */
export const getAllBookingsController = async (
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

    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');
    const from = req.query.from ? new Date(req.query.from) : undefined;
    const to = req.query.to ? new Date(req.query.to) : undefined;

    const { bookings, total } = await getAdminBookings(adminId, {
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
    logger.error({ error, query: req.query }, 'Error in getAllBookingsController');

    return res.status(500).json({
      success: false,
      bookings: [],
      pagination: { current_page: 1, total_pages: 0, total_count: 0, per_page: 10 }
    });
  }
};

/**
 * Obtener una reserva específica (Cliente o Admin)
 * GET /api/bookings/:id
 */
export const getBookingByIdController = async (
  req: GetBookingsRequest,
  res: Response<{ success: boolean; booking?: any; message: string }>
) => {
  try {
    const { id } = req.params;
    const clientId = req.client?.id;

    const booking = await getBookingById(id, clientId);

    return res.status(200).json({
      success: true,
      booking,
      message: 'Booking retrieved successfully'
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
      message: 'Internal server error'
    });
  }
};