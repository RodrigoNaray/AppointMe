import { Response } from 'express';
import * as service from './settings.services';
import logger from '../../utils/logger';
import {
  GetBookingRulesRequest,
  UpdateBookingRulesRequest,
  BookingRulesResponse,
  UpdateBookingRulesResponse,
  SettingsError
} from './settings.types';
import { AdminUser } from '@prisma/client';

/**
 * Settings Controller - Manejo de requests HTTP para configuración
 * 
 * Endpoints:
 * - GET /api/settings/booking-rules (público)
 * - PATCH /api/admin/settings/booking-rules (admin only)
 */

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * getBookingRules - Obtiene reglas de reserva públicas
 * 
 * GET /api/settings/booking-rules
 * Auth: Público (info necesaria para mostrar restricciones)
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "data": {
 *     "minBookingAdvanceMinutes": 60
 *   }
 * }
 */
export const getBookingRules = async (
  req: GetBookingRulesRequest,
  res: Response<BookingRulesResponse>
) => {
  try {
    const data = await service.getBookingRules();

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    logger.error({ error }, 'Error in getBookingRules controller');

    if (error instanceof Error && 'statusCode' in error) {
      const settingsError = error as SettingsError;
      return res.status(settingsError.statusCode).json({
        success: false,
        data: { minBookingAdvanceMinutes: 60, minCancellationNoticeMinutes: 120 }, // Fallback defaults
        message: settingsError.message
      });
    }

    return res.status(500).json({
      success: false,
      data: { minBookingAdvanceMinutes: 60, minCancellationNoticeMinutes: 120 }, // Fallback defaults
      message: 'Internal server error'
    });
  }
};

/**
 * getBusinessHours - Obtiene horarios de apertura del negocio
 * 
 * GET /api/settings/business-hours
 * Auth: Público (mostrar horarios en HomePage)
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "data": {
 *     "monday": { "isOpen": true, "openTime": "09:00", "closeTime": "17:00" },
 *     ...
 *   }
 * }
 * 
 * Justificación Cache:
 * - Horarios cambian infrecuentemente → cacheable
 * - Cache-Control: public, max-age=300 (5 minutos)
 */
export const getBusinessHours = async (
  req: GetBookingRulesRequest,
  res: Response
) => {
  try {
    const data = await service.getBusinessHours();

    // Set cache headers (5 minutos)
    res.set('Cache-Control', 'public, max-age=300');

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    logger.error({ error }, 'Error in getBusinessHours controller');

    if (error instanceof Error && 'statusCode' in error) {
      const settingsError = error as SettingsError;
      return res.status(settingsError.statusCode).json({
        success: false,
        data: null,
        message: settingsError.message
      });
    }

    return res.status(500).json({
      success: false,
      data: null,
      message: 'Internal server error'
    });
  }
};

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * updateBookingRules - Actualiza reglas de reserva del admin
 * 
 * PUT /api/admin/settings/booking-rules
 * Auth: isAdminAuthenticated
 * 
 * Body:
 * {
 *   "minBookingAdvanceMinutes": 120
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "data": {
 *     "minBookingAdvanceMinutes": 120
 *   },
 *   "message": "Booking rules updated successfully"
 * }
 */
export const updateBookingRules = async (
  req: any, // Type simplificado para compatibilidad con middleware
  res: Response<UpdateBookingRulesResponse>
) => {
  try {
    const admin = req.user as AdminUser | undefined;
    
    if (!admin?.id) {
      return res.status(401).json({
        success: false,
        data: { minBookingAdvanceMinutes: 60, minCancellationNoticeMinutes: 120 },
        message: 'Authentication required'
      });
    }

    const data = await service.updateBookingRules(admin.id, req.body);

    return res.status(200).json({
      success: true,
      data,
      message: 'Booking rules updated successfully'
    });

  } catch (error) {
    logger.error({ error, body: req.body }, 'Error in updateBookingRules controller');

    if (error instanceof Error && 'statusCode' in error) {
      const settingsError = error as SettingsError;
      return res.status(settingsError.statusCode).json({
        success: false,
        data: { minBookingAdvanceMinutes: 60, minCancellationNoticeMinutes: 120 },
        message: settingsError.message
      });
    }

    return res.status(500).json({
      success: false,
      data: { minBookingAdvanceMinutes: 60, minCancellationNoticeMinutes: 120 },
      message: 'Internal server error'
    });
  }
};
