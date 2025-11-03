import prisma from '../../config/prisma';
import logger from '../../utils/logger';
import { BookingRulesDTO, UpdateBookingRulesDTO, SettingsError, SettingsErrorCodes } from './settings.types';

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
