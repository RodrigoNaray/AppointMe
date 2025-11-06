import { Router } from 'express';
import * as settingsController from './settings.controller';
import { isAdminAuthenticated } from '../../middlewares/isAdminAuthenticated';

/**
 * Settings Routes
 * 
 * Rutas públicas:
 * - GET /api/settings/booking-rules
 * - GET /api/settings/business-hours
 * 
 * Rutas admin:
 * - PUT /api/admin/settings/booking-rules
 */

// ============================================================================
// PUBLIC ROUTES (prefijo /api/settings)
// ============================================================================

export const settingsRoutes = Router();

// GET /api/settings/booking-rules - Obtener reglas de reserva (público)
settingsRoutes.get('/booking-rules', settingsController.getBookingRules);

// GET /api/settings/business-hours - Obtener horarios de apertura (público)
settingsRoutes.get('/business-hours', settingsController.getBusinessHours);

// ============================================================================
// ADMIN ROUTES (prefijo /api/admin/settings)
// ============================================================================

export const adminSettingsRoutes = Router();

// PUT /api/admin/settings/booking-rules - Actualizar reglas de reserva (admin only)
adminSettingsRoutes.put(
  '/booking-rules',
  isAdminAuthenticated,
  settingsController.updateBookingRules
);
