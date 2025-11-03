import apiClient from './client'; // Usar cliente compartido con withCredentials

interface BookingRulesDTO {
  minBookingAdvanceMinutes: number;
  minCancellationNoticeMinutes: number;
}

interface UpdateBookingRulesDTO {
  minBookingAdvanceMinutes?: number;
  minCancellationNoticeMinutes?: number;
}

/**
 * Estructura de respuesta del backend para settings
 */
interface SettingsResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Obtiene las reglas de reserva configuradas (público)
 */
export const getBookingRules = async (): Promise<BookingRulesDTO> => {
  const response = await apiClient.get<SettingsResponse<BookingRulesDTO>>('/settings/booking-rules');
  return response.data.data; // Extraer data.data por estructura del backend
};

/**
 * Actualiza las reglas de reserva (solo admin)
 */
export const updateBookingRules = async (data: UpdateBookingRulesDTO): Promise<BookingRulesDTO> => {
  const response = await apiClient.put<SettingsResponse<BookingRulesDTO>>('/admin/settings/booking-rules', data);
  return response.data.data; // Extraer data.data por estructura del backend
};
