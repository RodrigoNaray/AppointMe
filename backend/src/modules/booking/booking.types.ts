import { Request } from 'express';
import { Booking, BookingStatus } from '@prisma/client';

// Re-export BookingStatus para uso en otros módulos
export { BookingStatus };

// Interfaces para requests
export interface CreateBookingRequest extends Request {
  body: {
    serviceId: string;
    bookingTime: string;
    notes?: string;
    clientTimezone: string;
  };
}

export interface GetBookingsRequest extends Request {
  query: {
    from?: string;
    to?: string;
    page?: string;
    limit?: string;
  };
}

export interface CancelBookingRequest extends Request {
  params: {
    id: string;
  };
}

export interface CancelBookingByAdminRequest extends Request {
  params: {
    id: string;
  };
  body: {
    reason?: string;
  };
}

export interface RescheduleBookingRequest extends Request {
  params: {
    id: string;
  };
  body: {
    newBookingTime: string;
  };
}

// Interfaces para responses
export interface BookingWithDetails extends Booking {
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
  };
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface CreateBookingResponse {
  success: boolean;
  booking?: BookingWithDetails;
  message: string;
}

export interface GetBookingsResponse {
  success: boolean;
  bookings: BookingWithDetails[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

// DTOs para validación de datos
export interface CreateBookingDTO {
  serviceId: string;
  bookingTime: Date;
  notes?: string;
}

export interface BookingFiltersDTO {
  from?: Date;
  to?: Date;
  status?: BookingStatus; // Filtro opcional por status
  page: number;
  limit: number;
}

// Error types
export interface BookingError extends Error {
  statusCode: number;
  code: string;
}

export interface CancelBookingByAdminResult {
  booking: BookingWithDetails;
  clientEmail: string;
  clientName: string;
  clientLanguage?: string;
  serviceName: string;
  bookingTime: Date;
  durationMinutes: number;
}

export interface RescheduleBookingByAdminResult {
  booking: BookingWithDetails;
  oldBookingTime: Date;
  newBookingTime: Date;
  clientEmail: string;
  clientName: string;
  clientLanguage?: string;
  serviceName: string;
  durationMinutes: number;
}

export enum BookingErrorCodes {
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  UNAVAILABLE_TIME = 'UNAVAILABLE_TIME',
  INVALID_TIME_RANGE = 'INVALID_TIME_RANGE',
  BOOKING_NOT_FOUND = 'BOOKING_NOT_FOUND',
  CANNOT_CANCEL = 'CANNOT_CANCEL',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INSUFFICIENT_NOTICE = 'INSUFFICIENT_NOTICE',
  OUTSIDE_WORKING_HOURS = 'OUTSIDE_WORKING_HOURS',
  ADMIN_NOT_FOUND = 'ADMIN_NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT'
}