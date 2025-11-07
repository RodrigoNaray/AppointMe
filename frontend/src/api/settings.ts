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
 * Business Hours Types
 */
export interface DaySchedule {
  isOpen: boolean;
  openTime: string;  // Formato "HH:mm" (ej: "09:00")
  closeTime: string; // Formato "HH:mm" (ej: "17:00")
}

export interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

/**
 * Contact Info Types
 */
export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
}

export interface UpdateContactInfoDTO {
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
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

/**
 * Obtiene los horarios de apertura del negocio (público)
 * 
 * Endpoint cacheable (5 minutos en backend)
 * 
 * @returns BusinessHours con horarios de cada día de la semana
 * 
 * Justificación TypeScript:
 * - Types exportados previenen typos en días de semana
 * - Formato consistente con backend (monday-sunday en inglés)
 */
export const getBusinessHours = async (): Promise<BusinessHours> => {
  const response = await apiClient.get<SettingsResponse<BusinessHours>>('/settings/business-hours');
  return response.data.data;
};

/**
 * Obtiene información de contacto del negocio (público)
 * 
 * Endpoint cacheable (5 minutos en backend)
 * 
 * @returns ContactInfo con teléfono, email y dirección
 * 
 * Justificación Cache:
 * - Información de contacto cambia infrecuentemente
 * - Backend devuelve Cache-Control: public, max-age=300
 * - Consistente con getBusinessHours (misma estrategia)
 */
export const getContactInfo = async (): Promise<ContactInfo> => {
  const response = await apiClient.get<SettingsResponse<ContactInfo>>('/settings/contact-info');
  return response.data.data;
};

/**
 * Actualiza información de contacto del negocio (solo admin)
 * 
 * @param data - Campos a actualizar (todos opcionales)
 * @returns ContactInfo actualizado
 * 
 * Validaciones backend:
 * - Email RFC 5322 + max 254 chars
 * - Phone E.164 internacional (+XX XXXXXXXXX)
 * - Address max 500 chars + no HTML tags
 */
export const updateContactInfo = async (data: UpdateContactInfoDTO): Promise<ContactInfo> => {
  const response = await apiClient.put<SettingsResponse<ContactInfo>>('/admin/settings/contact-info', data);
  return response.data.data;
};
