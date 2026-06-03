import axios, { AxiosError } from 'axios'
import { API_CONFIG } from './config';

const apiClient = axios.create(API_CONFIG);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const message =
        (error.response.data as { message?: string } | undefined)?.message ??
        'Demasiadas solicitudes. Por favor, intenta en unos minutos.';
      console.warn('[apiClient] Rate limit exceeded', { retryAfter, message });
    }
    return Promise.reject(error);
  }
);

export default apiClient;