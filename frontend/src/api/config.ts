/**
 * Configuración centralizada para clientes HTTP de la aplicación
 * 
 * Mejores prácticas aplicadas:
 * - Separación de configuración (separación de concerns)
 * - Variables de entorno con fallback seguro para desarrollo
 * - Configuración consistente entre todos los clientes API
 * - Sin rutas hardcodeadas en código de negocio
 * 
 * Referencias:
 * - Axios Best Practices 2025: https://axios-http.com/docs/config_defaults
 * - React Environment Variables: https://vitejs.dev/guide/env-and-mode.html
 * - OWASP API Security: withCredentials para cookies HttpOnly
 */

import type { CreateAxiosDefaults } from 'axios';

/**
 * Configuración base para todos los clientes HTTP de la aplicación
 * 
 * @property baseURL - URL base del API (desde env var o fallback a localhost en desarrollo)
 * @property withCredentials - Habilita envío de cookies HttpOnly (OWASP Security)
 * @property timeout - Tiempo máximo de espera para requests (10 segundos)
 * @property headers - Headers por defecto para todas las peticiones
 */
export const API_CONFIG: CreateAxiosDefaults = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true, // Crucial para cookies HttpOnly de sesión
  timeout: 10000, // 10 segundos
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * URL base del API (exportada por separado para uso directo si es necesario)
 * 
 * IMPORTANTE: Eliminamos trailing slash para consistencia
 * Esto previene URLs con doble slash como /api//bookings
 */
export const API_BASE_URL = (API_CONFIG.baseURL as string).replace(/\/$/, '');

