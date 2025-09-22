import { Request } from 'express';
import { Booking } from '@prisma/client';

// Interfaces para requests
export interface CreateBookingRequest extends Request {
  body: {
    serviceId: string;
    bookingTime: string; // ISO datetime string
    notes?: string;
  };
}

export interface GetBookingsRequest extends Request {
  query: {
    from?: string;    // ISO date string
    to?: string;      // ISO date string
    page?: string;
    limit?: string;
  };
}

export interface CancelBookingRequest extends Request {
  params: {
    id: string;
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
  booking: BookingWithDetails;
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
  page: number;
  limit: number;
}

// Error types
export interface BookingError extends Error {
  statusCode: number;
  code: string;
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
  ADMIN_NOT_FOUND = 'ADMIN_NOT_FOUND'
}