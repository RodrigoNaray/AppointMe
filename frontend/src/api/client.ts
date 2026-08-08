import axios, { AxiosError } from 'axios'
import { API_CONFIG } from './config';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { useBookingStore } from '@/stores/bookingStore';

const apiClient = axios.create(API_CONFIG);

const isAuthFlowRequest = (url?: string): boolean =>
  /^\/?auth\/(client\/)?(login|register|verify-email|resend-verification|forgot-password|reset-password|request-email-change|verify-email-change|change-password|google)/.test(
    url ?? ''
  );

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const message =
        (error.response.data as { message?: string } | undefined)?.message ??
        'Demasiadas solicitudes. Por favor, intenta en unos minutos.';
      console.warn('[apiClient] Rate limit exceeded', { retryAfter, message });
      toast.error(message);
    }

    if (error.response?.status === 401 && !isAuthFlowRequest(error.config?.url)) {
      useAuthStore.setState({ authState: { type: null, user: null, isAuthenticated: false } });
      useBookingStore.getState().clearCart();
      const currentPath = window.location.pathname + window.location.search;
      if (!currentPath.startsWith('/login')) {
        window.location.href = `/login?returnUrl=${encodeURIComponent(currentPath)}`;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;