import { Router } from 'express';
import * as settingsController from './settings.controller';
import { isAdminAuthenticated } from '../../middlewares/isAdminAuthenticated';

/**
 * Settings Routes
 * 
 * Rutas públicas:
 * - GET /api/settings/booking-rules
 * - GET /api/settings/business-hours
 * - GET /api/settings/contact-info
 * 
 * Rutas admin:
 * - PUT /api/admin/settings/booking-rules
 * - PUT /api/admin/settings/contact-info
 */

// ============================================================================
// PUBLIC ROUTES (prefijo /api/settings)
// ============================================================================

export const settingsRoutes = Router();

// GET /api/settings/booking-rules - Obtener reglas de reserva (público)
settingsRoutes.get('/booking-rules', settingsController.getBookingRules);

// GET /api/settings/business-hours - Obtener horarios de apertura (público)
settingsRoutes.get('/business-hours', settingsController.getBusinessHours);

// GET /api/settings/contact-info - Obtener información de contacto (público)
settingsRoutes.get('/contact-info', settingsController.getContactInfo);

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

// PUT /api/admin/settings/contact-info - Actualizar información de contacto (admin only)
adminSettingsRoutes.put(
  '/contact-info',
  isAdminAuthenticated,
  settingsController.updateContactInfo
);
