import prisma from '../../config/prisma';
import logger from '../../utils/logger';
import { BookingRulesDTO, UpdateBookingRulesDTO, BusinessHoursDTO, DayScheduleDTO, SettingsError, SettingsErrorCodes } from './settings.types';

/**
 * Settings Service - Lógica de negocio para configuración del sistema
 * 
 * OWASP Security:
 * - Input validation: minBookingAdvanceMinutes debe ser positivo
 * - Authorization: Solo admin puede actualizar
 * - Rate limiting: Implícito por endpoint (no se actualiza frecuentemente)
 * 
 * Referencias:
 * - Prisma docs: https://www.prisma.io/docs/concepts/components/prisma-client
 */

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * getBookingRules - Obtiene reglas de reserva públicas
 * 
 * Endpoint público necesario para que clientes vean restricciones antes de reservar
 * Por ahora devuelve configuración del primer admin (single-tenant)
 * 
 * TODO: Si se migra a multi-tenant, pasar adminId como parámetro
 * 
 * @returns BookingRulesDTO con configuración
 * @throws SettingsError si no existe admin
 */
export const getBookingRules = async (): Promise<BookingRulesDTO> => {
  try {
    // Single-tenant: obtener primer admin
    const admin = await prisma.adminUser.findFirst({
      select: {
        minBookingNoticeMinutes: true,
        minCancellationNoticeMinutes: true
      }
    });

    if (!admin) {
      const error: SettingsError = new Error('No admin configuration found') as SettingsError;
      error.statusCode = 404;
      throw error;
    }

    return {
      minBookingAdvanceMinutes: admin.minBookingNoticeMinutes || 60,
      minCancellationNoticeMinutes: admin.minCancellationNoticeMinutes || 120
    };

  } catch (error) {
    logger.error({ error }, 'Error in getBookingRules service');
    throw error;
  }
};

/**
 * getBusinessHours - Obtiene horarios de apertura del negocio
 * 
 * Endpoint público para mostrar horarios en HomePage
 * Lee AdminUser.schedule (JSON) y lo parsea a formato estructurado
 * 
 * Formato schedule en DB: { "monday": { "start": "09:00", "end": "17:00", "isActive": true }, ... }
 * 
 * Si schedule es null, devuelve horario por defecto:
 * - Lunes-Viernes: 9:00 - 17:00 (abierto)
 * - Sábado-Domingo: Cerrado
 * 
 * @returns BusinessHoursDTO con horarios de cada día
 * @throws SettingsError si no existe admin
 * 
 * Justificación OWASP A04:2021 (Insecure Design):
 * - Información pública no sensible (no requiere autenticación)
 * - Formato estructurado previene injection attacks
 * 
 * Justificación Performance:
 * - Endpoint cacheable por CDN/browser (Cache-Control: public, max-age=300)
 * - Single query a DB (eficiente)
 */
export const getBusinessHours = async (): Promise<BusinessHoursDTO> => {
  try {
    // Single-tenant: obtener primer admin
    const admin = await prisma.adminUser.findFirst({
      select: {
        schedule: true
      }
    });

    if (!admin) {
      const error: SettingsError = new Error('No admin configuration found') as SettingsError;
      error.statusCode = 404;
      throw error;
    }

    // Horario por defecto si schedule es null
    const defaultSchedule: BusinessHoursDTO = {
      monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      saturday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
      sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' }
    };

    // Si no hay schedule configurado, devolver default
    if (!admin.schedule) {
      return defaultSchedule;
    }

    // Parsear schedule de DB (viene como JSON)
    const scheduleData = admin.schedule as Record<string, { start: string; end: string; isActive: boolean }>;

    // Mapear formato DB → DTO
    const businessHours: BusinessHoursDTO = {
      monday: mapDaySchedule(scheduleData.monday),
      tuesday: mapDaySchedule(scheduleData.tuesday),
      wednesday: mapDaySchedule(scheduleData.wednesday),
      thursday: mapDaySchedule(scheduleData.thursday),
      friday: mapDaySchedule(scheduleData.friday),
      saturday: mapDaySchedule(scheduleData.saturday),
      sunday: mapDaySchedule(scheduleData.sunday)
    };

    return businessHours;

  } catch (error) {
    logger.error({ error }, 'Error in getBusinessHours service');
    throw error;
  }
};

/**
 * mapDaySchedule - Helper para mapear formato DB a DTO
 * 
 * @param dayData - Datos del día desde DB
 * @returns DayScheduleDTO formateado
 */
function mapDaySchedule(dayData: { start: string; end: string; isActive: boolean } | undefined): DayScheduleDTO {
  if (!dayData) {
    return { isOpen: false, openTime: '00:00', closeTime: '00:00' };
  }

  return {
    isOpen: dayData.isActive,
    openTime: dayData.start,
    closeTime: dayData.end
  };
}

// ============================================================================
// ADMIN MUTATIONS
// ============================================================================

/**
 * updateBookingRules - Actualiza reglas de reserva del admin
 * 
 * Validaciones OWASP:
 * - minBookingAdvanceMinutes debe ser >= 0
 * - minBookingAdvanceMinutes debe ser <= 10080 (1 semana en minutos)
 * 
 * @param adminId - ID del admin autenticado
 * @param data - Datos a actualizar
 * @returns BookingRulesDTO actualizado
 * @throws SettingsError si validación falla
 */
export const updateBookingRules = async (
  adminId: string,
  data: UpdateBookingRulesDTO
): Promise<BookingRulesDTO> => {
  try {
    // Validación: minBookingAdvanceMinutes
    if (data.minBookingAdvanceMinutes !== undefined) {
      if (data.minBookingAdvanceMinutes < 0) {
        const error: SettingsError = new Error('minBookingAdvanceMinutes must be non-negative') as SettingsError;
        error.statusCode = 400;
        throw error;
      }

      if (data.minBookingAdvanceMinutes > 10080) {
        const error: SettingsError = new Error('minBookingAdvanceMinutes cannot exceed 1 week (10080 minutes)') as SettingsError;
        error.statusCode = 400;
        throw error;
      }
    }

    // Validación: minCancellationNoticeMinutes
    if (data.minCancellationNoticeMinutes !== undefined) {
      if (data.minCancellationNoticeMinutes < 0) {
        const error: SettingsError = new Error('minCancellationNoticeMinutes must be non-negative') as SettingsError;
        error.statusCode = 400;
        throw error;
      }

      if (data.minCancellationNoticeMinutes > 10080) {
        const error: SettingsError = new Error('minCancellationNoticeMinutes cannot exceed 1 week (10080 minutes)') as SettingsError;
        error.statusCode = 400;
        throw error;
      }
    }

    // Actualizar en DB
    const admin = await prisma.adminUser.update({
      where: { id: adminId },
      data: {
        minBookingNoticeMinutes: data.minBookingAdvanceMinutes,
        minCancellationNoticeMinutes: data.minCancellationNoticeMinutes
      },
      select: {
        minBookingNoticeMinutes: true,
        minCancellationNoticeMinutes: true
      }
    });

    logger.info({ 
      adminId, 
      minBookingAdvanceMinutes: data.minBookingAdvanceMinutes,
      minCancellationNoticeMinutes: data.minCancellationNoticeMinutes
    }, 'Booking rules updated');

    return {
      minBookingAdvanceMinutes: admin.minBookingNoticeMinutes || 60,
      minCancellationNoticeMinutes: admin.minCancellationNoticeMinutes || 120
    };

  } catch (error) {
    logger.error({ error, adminId, data }, 'Error in updateBookingRules service');
    throw error;
  }
};
