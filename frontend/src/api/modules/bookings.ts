import apiClient from '../client';

// ============================================================================
// TYPES
// ============================================================================

export interface Booking {
  id: string;
  clientId: string;
  serviceId: string;
  bookingTime: string; // ISO 8601
  status: 'CONFIRMED' | 'CANCELLED';
  durationMinutes: number; // Snapshot de duración al momento de reservar
  reminderSent: boolean; // Para sistema de notificaciones
  createdAt: string;
  updatedAt: string;
  // Relaciones incluidas por el backend
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
  };
}

export interface PaginationResponse {
  current_page: number;
  total_pages: number;
  total_count: number;
  per_page: number;
}

export interface GetBookingsResponse {
  success: boolean;
  bookings: Booking[];
  pagination: PaginationResponse;
}

export interface GetBookingsParams {
  page?: number;
  limit?: number;
  from?: string; // ISO date
  to?: string;   // ISO date
}

export interface CreateBookingPayload {
  serviceId: string;
  bookingTime: string; // ISO 8601
  notes?: string;
}

export interface CreateBookingResponse {
  success: boolean;
  booking: Booking;
  message: string;
}

// ============================================================================
// ADMIN API
// ============================================================================

export const getAllBookings = async (params?: GetBookingsParams): Promise<GetBookingsResponse> => {
  const response = await apiClient.get<GetBookingsResponse>('/admin/bookings', { params });
  return response.data;
};

// ============================================================================
// CLIENT API
// ============================================================================

export const getMyBookings = async (params?: GetBookingsParams): Promise<GetBookingsResponse> => {
  const response = await apiClient.get<GetBookingsResponse>('/bookings/my', { params });
  return response.data;
};

export const createBooking = async (payload: CreateBookingPayload): Promise<CreateBookingResponse> => {
  const response = await apiClient.post<CreateBookingResponse>('/bookings/create', payload);
  return response.data;
};


export const cancelBooking = async (bookingId: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.put(`/bookings/${bookingId}/cancel`);
  return response.data;
};

export default {
  // Admin
  getAllBookings,
  
  // Client
  getMyBookings,
  createBooking,
  cancelBooking,
};
