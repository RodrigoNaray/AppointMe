import axios from 'axios';
import type { LoginDto, RegisterDto, ClientUser } from '../types/auth';
import { API_CONFIG } from './config';

/**
 * Cliente HTTP específico para autenticación de clientes
 * 
 * Separación de concerns: mantener lógica de auth aislada del cliente genérico
 * permite interceptores específicos y mejor testabilidad
 * 
 * Configuración: importada desde config.ts para consistencia
 */
const clientAuthApi = axios.create(API_CONFIG);

// Interceptor para manejar errores específicos de autenticación cliente
clientAuthApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // En una migración futura a Redux, este será un dispatch action
    return Promise.reject(error);
  }
);

export const clientAuthService = {
  /**
   * Login de cliente usando endpoints específicos de cliente
   * @param data Credenciales de login
   * @returns Datos del cliente autenticado
   */
  login: async (data: LoginDto): Promise<ClientUser> => {
    const response = await clientAuthApi.post<{ message: string; client: ClientUser }>('/auth/client/login', data);
    return { ...response.data.client, type: 'client' as const };
  },

  /**
   * Registro de nuevo cliente con verificación de correo
   * @param data Datos de registro
   * @returns Respuesta del servidor
   */
  register: async (data: RegisterDto): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await clientAuthApi.post<{ message: string; client: any }>('/auth/client/register', data);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error en el registro'
      };
    }
  },

  /**
   * Verificar email del cliente
   * @param token Token de verificación recibido por email
   * @returns Respuesta del servidor
   */
  verifyEmail: async (token: string): Promise<{ success: boolean; message: string; client?: any; alreadyVerified?: boolean }> => {
    try {
      const response = await clientAuthApi.post<{ message: string; client: any; alreadyVerified?: boolean }>('/auth/client/verify-email', { token });
      return {
        success: true,
        message: response.data.message,
        client: response.data.client,
        alreadyVerified: response.data.alreadyVerified
      };
    } catch (error: any) {
      // Si el error indica que ya está verificado, tratarlo como éxito
      const alreadyVerified = error.response?.data?.alreadyVerified === true;
      return {
        success: alreadyVerified, // Éxito si ya está verificado
        message: error.response?.data?.message || 'Error en la verificación',
        alreadyVerified
      };
    }
  },

  /**
   * Reenviar email de verificación (usuario autenticado)
   * OWASP: No requiere email en el body - se obtiene del JWT
   * @returns Respuesta del servidor
   */
  resendVerification: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await clientAuthApi.post<{ message: string }>('/auth/client/resend-verification');
      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al reenviar verificación'
      };
    }
  },

  /**
   * Obtener perfil del cliente autenticado
   * @returns Datos del cliente
   */
  getProfile: async (): Promise<ClientUser> => {
    const response = await clientAuthApi.get<{ user: ClientUser }>('/auth/client/profile');
    return { ...response.data.user, type: 'client' as const };
  },

  /**
   * Logout del cliente
   */
  logout: async (): Promise<void> => {
    await clientAuthApi.post('/auth/client/logout');
  },

  /**
   * Solicitar cambio de email (usuario autenticado)
   * @param newEmail Nuevo email
   * @param password Contraseña para confirmar identidad
   * @returns Respuesta del servidor
   */
  requestEmailChange: async (newEmail: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await clientAuthApi.post<{ message: string }>('/auth/client/request-email-change', { 
        newEmail, 
        password 
      });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al solicitar cambio de email'
      };
    }
  },

  /**
   * Verificar cambio de email mediante token
   * @param token Token de verificación
   * @returns Respuesta del servidor
   */
  verifyEmailChange: async (token: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await clientAuthApi.post<{ message: string }>('/auth/client/verify-email-change', { token });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al verificar cambio de email'
      };
    }
  },

  /**
   * Cambiar contraseña del cliente autenticado
   * @param currentPassword Contraseña actual
   * @param newPassword Nueva contraseña
   * @returns Respuesta del servidor
   */
  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await clientAuthApi.post<{ message: string }>(
        '/auth/client/change-password',
        { currentPassword, newPassword }
      );
      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al cambiar la contraseña'
      };
    }
  },
};

export default clientAuthService;