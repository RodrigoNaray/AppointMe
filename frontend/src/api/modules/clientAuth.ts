import type { LoginDto, RegisterDto, ClientUser } from '../../types/auth';
import apiClient from '../client';

const clientAuthApi = apiClient


clientAuthApi.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export const clientAuthService = {

  login: async (data: LoginDto): Promise<ClientUser> => {
    const response = await clientAuthApi.post<{ message: string; client: ClientUser }>('/auth/client/login', data);
    return { ...response.data.client, type: 'client' as const };
  },

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

  getProfile: async (): Promise<ClientUser> => {
    const response = await clientAuthApi.get<{ user: ClientUser }>('/auth/client/profile');
    return { ...response.data.user, type: 'client' as const };
  },

  logout: async (): Promise<void> => {
    await clientAuthApi.post('/auth/client/logout');
  },

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