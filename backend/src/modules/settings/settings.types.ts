/**
 * Settings Types - Tipos para configuración del sistema
 * 
 * Scope: Configuración de reglas de negocio del admin
 */

import { Request } from 'express';
import { AdminUser } from '@prisma/client';

// ============================================================================
// DTOs
// ============================================================================

export interface BookingRulesDTO {
  minBookingAdvanceMinutes: number;
}

export interface UpdateBookingRulesDTO {
  minBookingAdvanceMinutes?: number;
}

// ============================================================================
// Request Types
// ============================================================================

export interface GetBookingRulesRequest extends Request {
  // Público - no requiere auth
}

export interface UpdateBookingRulesRequest extends Request {
  user?: AdminUser; // Viene del middleware isAdminAuthenticated
  body: UpdateBookingRulesDTO;
}

// ============================================================================
// Response Types
// ============================================================================

export interface BookingRulesResponse {
  success: boolean;
  data: BookingRulesDTO;
  message?: string;
}

export interface UpdateBookingRulesResponse {
  success: boolean;
  data: BookingRulesDTO;
  message: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface SettingsError extends Error {
  statusCode: number;
}

export const SettingsErrorCodes = {
  INVALID_VALUE: 'SETTINGS_INVALID_VALUE',
  UNAUTHORIZED: 'SETTINGS_UNAUTHORIZED',
  NOT_FOUND: 'SETTINGS_NOT_FOUND',
} as const;
