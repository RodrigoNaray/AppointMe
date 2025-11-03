/**
 * Servicio API para Bookings (Reservas)
 * 
 * Endpoints:
 * - Admin: GET /admin/bookings (todas las reservas del sistema)
 * - Client: GET /api/bookings/my (reservas del cliente autenticado)
 * - Client: POST /api/bookings/create (crear nueva reserva)
 * - Client: PATCH /api/bookings/:id/cancel (cancelar reserva)
 * 
 * OWASP Security:
 * - Autenticación: cookies HttpOnly (credentials: 'include')
 * - Authorization: Backend valida roles (isAdminAuthenticated, isClientAuthenticated)
 * - Input validation: Tipos TypeScript + validación backend
 * 
 * Referencias:
 * - Axios docs: https://axios-http.com/docs/intro
 * - React Query integration: Preparado para useSWR/React Query
 */

import apiClient from './client';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Booking - Estructura de una reserva desde el backend
 * 
 * Nota: El backend devuelve objetos relacionados (client, service)
 * No solo IDs o nombres planos
 */
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

/**
 * getAllBookings - Obtiene todas las reservas del sistema (Admin)
 * 
 * Endpoint: GET /admin/bookings
 * Auth: Requiere admin autenticado
 * 
 * @param params - Paginación y filtros de fecha
 * @returns Promesa con reservas y paginación
 * 
 * Uso:
 * ```typescript
 * const { bookings, pagination } = await bookingService.getAllBookings({ page: 1, limit: 20 });
 * ```
 */
export const getAllBookings = async (params?: GetBookingsParams): Promise<GetBookingsResponse> => {
  const response = await apiClient.get<GetBookingsResponse>('/admin/bookings', { params });
  return response.data;
};

// ============================================================================
// CLIENT API
// ============================================================================

/**
 * getMyBookings - Obtiene reservas del cliente autenticado
 * 
 * Endpoint: GET /api/bookings/my
 * Auth: Requiere client autenticado
 * 
 * @param params - Paginación y filtros de fecha
 * @returns Promesa con reservas y paginación
 */
export const getMyBookings = async (params?: GetBookingsParams): Promise<GetBookingsResponse> => {
  const response = await apiClient.get<GetBookingsResponse>('/bookings/my', { params });
  return response.data;
};

/**
 * createBooking - Crea una nueva reserva
 * 
 * Endpoint: POST /api/bookings/create
 * Auth: Requiere client autenticado
 * 
 * @param payload - Datos de la reserva (serviceId, bookingTime, notes)
 * @returns Promesa con reserva creada
 * 
 * OWASP:
 * - Backend valida conflictos de horario (409)
 * - Backend valida disponibilidad del servicio
 * - Backend valida formato de fecha/hora
 */
export const createBooking = async (payload: CreateBookingPayload): Promise<CreateBookingResponse> => {
  const response = await apiClient.post<CreateBookingResponse>('/bookings/create', payload);
  return response.data;
};

/**
 * cancelBooking - Cancela una reserva existente
 * 
 * Endpoint: PUT /api/bookings/:id/cancel
 * Auth: Requiere client autenticado (owner de la reserva)
 * 
 * @param bookingId - ID de la reserva a cancelar
 * @returns Promesa con resultado
 * 
 * Nota: Usa PUT en vez de PATCH por mejor compatibilidad con proxies/firewalls corporativos
 */
export const cancelBooking = async (bookingId: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.put(`/bookings/${bookingId}/cancel`);
  return response.data;
};

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  // Admin
  getAllBookings,
  
  // Client
  getMyBookings,
  createBooking,
  cancelBooking,
};
