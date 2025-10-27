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
 * URL base del API (limpia trailing slash PRIMERO)
 * 
 * IMPORTANTE: Limpiamos trailing slash ANTES de usar en API_CONFIG
 * Esto previene URLs con doble slash como /api//bookings
 * 
 * @example
 * VITE_API_BASE_URL=http://localhost:5000/api/ → http://localhost:5000/api
 */
const rawBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
export const API_BASE_URL = rawBaseURL.replace(/\/$/, '');

/**
 * Configuración base para todos los clientes HTTP de la aplicación
 * 
 * @property baseURL - URL base del API (YA limpia, sin trailing slash)
 * @property withCredentials - Habilita envío de cookies HttpOnly (OWASP Security)
 * @property timeout - Tiempo máximo de espera para requests (10 segundos)
 * @property headers - Headers por defecto para todas las peticiones
 * 
 * Referencias:
 * - Axios Best Practices 2025: https://axios-http.com/docs/config_defaults
 * - OWASP API Security: withCredentials para cookies HttpOnly
 */
export const API_CONFIG: CreateAxiosDefaults = {
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial para cookies HttpOnly de sesión
  timeout: 10000, // 10 segundos
  headers: {
    'Content-Type': 'application/json',
  },
};

