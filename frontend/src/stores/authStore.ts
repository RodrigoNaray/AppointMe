import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import apiClient from '../api/client';
import clientAuthService from '../api/clientAuth';
import { useBookingStore } from './bookingStore';
import type { LoginDto, RegisterDto, AuthState, AdminUser } from '../types/auth';



interface AuthStoreState {

  authState: AuthState;
  isLoading: boolean;
  
  
  loginAdmin: (data: LoginDto) => Promise<void>;
  logoutAdmin: () => Promise<void>;
  loginClient: (data: LoginDto) => Promise<void>;
  logoutClient: () => Promise<void>;
  registerClient: (data: RegisterDto) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  
  
  _setAuthState: (state: AuthState) => void;
  _setIsLoading: (loading: boolean) => void;
}


export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      authState: { type: null, user: null, isAuthenticated: false },
      isLoading: true,

      loginAdmin: async (data) => {
        try {
          await apiClient.post('auth/login', data);
          const response = await apiClient.get<{ user: AdminUser }>('auth/profile');
          
          set({
            authState: {
              type: 'admin',
              user: { ...response.data.user, type: 'admin' as const },
              isAuthenticated: true
            }
          });
        } catch (error) {
          set({ authState: { type: null, user: null, isAuthenticated: false } });
          throw error;
        }
      },

      logoutAdmin: async () => {
        try {
          await apiClient.post('auth/logout');
        } finally {
          const currentState = get().authState;
          if (currentState.type === 'admin') {
            set({ authState: { type: null, user: null, isAuthenticated: false } });
            useBookingStore.getState().clearCart();
          }
        }
      },


      loginClient: async (data) => {
        try {
          const clientUser = await clientAuthService.login(data);
          
          set({
            authState: {
              type: 'client',
              user: clientUser,
              isAuthenticated: true
            }
          });
        } catch (error) {
          set({ authState: { type: null, user: null, isAuthenticated: false } });
          throw error;
        }
      },

      logoutClient: async () => {
        try {
          await clientAuthService.logout();
        } finally {
          const currentState = get().authState;
          if (currentState.type === 'client') {
            set({ authState: { type: null, user: null, isAuthenticated: false } });
            useBookingStore.getState().clearCart();
          }
        }
      },


      registerClient: async (data) => {
        try {
          const result = await clientAuthService.register(data);
          
          if (!result.success) {
            throw new Error(result.message);
          }
          
          return result;
        } catch (error) {
          throw error;
        }
      },

      logout: async () => {
        const { authState, logoutAdmin, logoutClient } = get();
        
        if (authState.type === 'admin') {
          await logoutAdmin();
        } else if (authState.type === 'client') {
          await logoutClient();
        }
      },

      checkSession: async () => {
        set({ isLoading: true });
        
        try {

          try {
            const adminResponse = await apiClient.get<{ user: AdminUser }>('auth/profile');
            set({
              authState: {
                type: 'admin',
                user: { ...adminResponse.data.user, type: 'admin' as const },
                isAuthenticated: true
              },
              isLoading: false
            });
            return;
          } catch (adminError) {
            // Admin no autenticado, intentar cliente
          }

          try {
            const clientUser = await clientAuthService.getProfile();
            set({
              authState: {
                type: 'client',
                user: clientUser,
                isAuthenticated: true
              },
              isLoading: false
            });
            return;
          } catch (clientError) {
            // Cliente no autenticado
          }

          set({
            authState: { type: null, user: null, isAuthenticated: false },
            isLoading: false
          });
        } catch (error) {
          console.error('[AuthStore] Error checking session:', error);
          set({ 
            authState: { type: null, user: null, isAuthenticated: false },
            isLoading: false
          });
        }
      },

      _setAuthState: (authState) => set({ authState }),
      _setIsLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'appointmepro-auth-storage',
      storage: createJSONStorage(() => sessionStorage), 
      version: 1,
      
      partialize: (state) => ({ authState: state.authState }),
      
    }
  )
);


export const selectAuthState = (state: AuthStoreState) => state.authState;
export const selectIsLoading = (state: AuthStoreState) => state.isLoading;
export const selectIsAuthenticated = (state: AuthStoreState) => state.authState.isAuthenticated;
export const selectUser = (state: AuthStoreState) => state.authState.user;
export const selectAuthType = (state: AuthStoreState) => state.authState.type;

// Actions
export const selectLoginAdmin = (state: AuthStoreState) => state.loginAdmin;
export const selectLogoutAdmin = (state: AuthStoreState) => state.logoutAdmin;
export const selectLoginClient = (state: AuthStoreState) => state.loginClient;
export const selectLogoutClient = (state: AuthStoreState) => state.logoutClient;
export const selectRegisterClient = (state: AuthStoreState) => state.registerClient;
export const selectLogout = (state: AuthStoreState) => state.logout;
export const selectCheckSession = (state: AuthStoreState) => state.checkSession;
