import type { LoginDto, RegisterDto, ClientUser } from '../../types/auth';
import axios from 'axios';
import apiClient from '../client';

const clientAuthApi = apiClient


clientAuthApi.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export const clientAuthService = {

  getErrorData: (error: unknown): { message?: string; alreadyVerified?: boolean } | null => {
    if (axios.isAxiosError<{ message?: string; alreadyVerified?: boolean }>(error)) {
      return error.response?.data ?? null;
    }
    return null;
  },

  login: async (data: LoginDto): Promise<ClientUser> => {
    const response = await clientAuthApi.post<{ message: string; client: ClientUser }>('/auth/client/login', data);
    return { ...response.data.client, type: 'client' as const };
  },

  register: async (data: RegisterDto): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await clientAuthApi.post<{ message: string; client: Record<string, unknown> }>('/auth/client/register', data);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error: unknown) {
      const errorData = clientAuthService.getErrorData(error);
      return {
        success: false,
        message: errorData?.message || 'Error en el registro'
      };
    }
  },

  verifyEmail: async (token: string): Promise<{ success: boolean; message: string; client?: Record<string, unknown>; alreadyVerified?: boolean }> => {
    try {
      const response = await clientAuthApi.post<{ message: string; client: Record<string, unknown>; alreadyVerified?: boolean }>('/auth/client/verify-email', { token });
      return {
        success: true,
        message: response.data.message,
        client: response.data.client,
        alreadyVerified: response.data.alreadyVerified
      };
    } catch (error: unknown) {
      // Si el error indica que ya está verificado, tratarlo como éxito
      const errorData = clientAuthService.getErrorData(error);
      const alreadyVerified = errorData?.alreadyVerified === true;
      return {
        success: alreadyVerified, // Éxito si ya está verificado
        message: errorData?.message || 'Error en la verificación',
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
    } catch (error: unknown) {
      const errorData = clientAuthService.getErrorData(error);
      return {
        success: false,
        message: errorData?.message || 'Error al reenviar verificación'
      };
    }
  },

  getProfile: async (): Promise<ClientUser> => {
    const response = await clientAuthApi.get<{ user: ClientUser }>('/auth/client/profile');
    return { ...response.data.user, type: 'client' as const };
  },

  updateProfile: async (data: Partial<{ name: string; phone: string; emailLanguage: string }>): Promise<ClientUser> => {
    const response = await clientAuthApi.patch<{ message: string; client: ClientUser }>('/auth/client/profile', data);
    return { ...response.data.client, type: 'client' as const };
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
    } catch (error: unknown) {
      const errorData = clientAuthService.getErrorData(error);
      return {
        success: false,
        message: errorData?.message || 'Error al solicitar cambio de email'
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
    } catch (error: unknown) {
      const errorData = clientAuthService.getErrorData(error);
      return {
        success: false,
        message: errorData?.message || 'Error al verificar cambio de email'
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
    } catch (error: unknown) {
      const errorData = clientAuthService.getErrorData(error);
      return {
        success: false,
        message: errorData?.message || 'Error al cambiar la contraseña'
      };
    }
  },
};

export default clientAuthService;