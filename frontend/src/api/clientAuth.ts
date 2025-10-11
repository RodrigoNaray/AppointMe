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
    if (error.response?.status === 401) {
      // En una migración futura a Redux, este será un dispatch action
      console.warn('Client session expired');
    }
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
    const response = await clientAuthApi.post<{ user: ClientUser }>('/auth/client/login', data);
    return { ...response.data.user, type: 'client' as const };
  },

  /**
   * Registro de nuevo cliente
   * @param data Datos de registro
   * @returns Cliente registrado
   */
  register: async (data: RegisterDto): Promise<ClientUser> => {
    const response = await clientAuthApi.post<{ user: ClientUser }>('/auth/client/register', data);
    return { ...response.data.user, type: 'client' as const };
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
};

export default clientAuthService;