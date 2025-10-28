import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import apiClient from '../api/client';
import clientAuthService from '../api/clientAuth';
import { useBookingStore } from './bookingStore';
import type { LoginDto, RegisterDto, AuthState, AdminUser } from '../types/auth';

/**
 * AuthStore - Zustand store para autenticación dual (Admin + Client)
 * 
 * Arquitectura Redux-ready (preparada para migración futura):
 * - Actions separadas del estado (patrón Redux-like)
 * - Selectors explícitos para composición
 * - Persist middleware con sessionStorage (seguridad OWASP)
 * - Discriminated unions para type safety
 * 
 * Mejores prácticas Zustand 5.0 + OWASP (2025):
 * - sessionStorage (NO localStorage): Sesión se pierde al cerrar tab (seguridad)
 * - Discriminated unions: AuthState type-safe con TypeScript
 * - clearCart() en logout: Previene leakage entre sesiones
 * - checkSession() en init: Restaura sesión desde cookies HttpOnly
 * 
 * Referencias:
 * - Zustand persist: https://docs.pmnd.rs/zustand/integrations/persisting-store-data
 * - OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
 * - Discriminated unions: https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html
 */

// ============================================================================
// TYPES
// ============================================================================

interface AuthStoreState {
  // Estado
  authState: AuthState;
  isLoading: boolean;
  
  // Actions (patrón Redux-like: verbos descriptivos)
  loginAdmin: (data: LoginDto) => Promise<void>;
  logoutAdmin: () => Promise<void>;
  loginClient: (data: LoginDto) => Promise<void>;
  logoutClient: () => Promise<void>;
  registerClient: (data: RegisterDto) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  
  // Internal actions (no exportar como selectores)
  _setAuthState: (state: AuthState) => void;
  _setIsLoading: (loading: boolean) => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      authState: { type: null, user: null, isAuthenticated: false },
      isLoading: true,

      // ========================================================================
      // ACTIONS - ADMIN
      // ========================================================================

      /**
       * loginAdmin - Autentica usuario administrador
       * 
       * @param data - Credenciales (email + password)
       * @throws Error si falla autenticación
       * 
       * Flujo:
       * 1. POST /auth/login (establece cookie HttpOnly)
       * 2. GET /auth/profile (obtiene datos del admin)
       * 3. Actualiza authState con discriminated union type: 'admin'
       */
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

      /**
       * logoutAdmin - Cierra sesión de administrador
       * 
       * Flujo:
       * 1. POST /auth/logout (elimina cookie HttpOnly)
       * 2. Limpia authState
       * 3. Limpia carrito (previene leakage OWASP)
       */
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

      // ========================================================================
      // ACTIONS - CLIENT
      // ========================================================================

      /**
       * loginClient - Autentica usuario cliente
       * 
       * @param data - Credenciales (email + password)
       * @throws Error si falla autenticación
       * 
       * Flujo:
       * 1. clientAuthService.login() (establece cookie HttpOnly)
       * 2. Actualiza authState con discriminated union type: 'client'
       */
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

      /**
       * logoutClient - Cierra sesión de cliente
       * 
       * Flujo:
       * 1. clientAuthService.logout() (elimina cookie HttpOnly)
       * 2. Limpia authState
       * 3. Limpia carrito (previene leakage OWASP)
       */
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

      /**
       * registerClient - Registra nuevo cliente
       * 
       * @param data - Datos de registro (email, password, nombre, etc.)
       * @returns Resultado con mensaje (requiere verificación email)
       * 
       * Nota: NO autentica automáticamente (requiere verificar email primero)
       */
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

      // ========================================================================
      // ACTIONS - GENERIC
      // ========================================================================

      /**
       * logout - Logout genérico (detecta tipo automáticamente)
       * 
       * Útil para componentes que no saben qué tipo de usuario es
       */
      logout: async () => {
        const { authState, logoutAdmin, logoutClient } = get();
        
        if (authState.type === 'admin') {
          await logoutAdmin();
        } else if (authState.type === 'client') {
          await logoutClient();
        }
      },

      /**
       * checkSession - Verifica sesión existente al inicializar app
       * 
       * Flujo:
       * 1. Intenta GET /auth/profile (admin)
       * 2. Si falla, intenta clientAuthService.getProfile() (client)
       * 3. Si ambos fallan, LIMPIA sessionStorage (cookies expiradas)
       * 
       * OWASP Security: sessionStorage NO es source of truth, cookies HttpOnly sí
       * Si cookies no existen, sessionStorage debe limpiarse para prevenir
       * false positives de autenticación
       * 
       * Llamado desde App.tsx useEffect on mount
       */
      checkSession: async () => {
        set({ isLoading: true });
        
        try {
          // Intentar sesión admin
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

          // Intentar sesión cliente
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

          // Si llegamos aquí, NO hay sesión válida
          // OWASP: Limpiar sessionStorage si cookies no existen
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

      // ========================================================================
      // INTERNAL ACTIONS (no exportar como selectores)
      // ========================================================================

      _setAuthState: (authState) => set({ authState }),
      _setIsLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'appointme-auth-storage',
      storage: createJSONStorage(() => sessionStorage), // sessionStorage para seguridad OWASP
      version: 1,
      
      // Particionar: solo persistir authState, NO acciones ni isLoading
      partialize: (state) => ({ authState: state.authState }),
      
      // Migración de versiones futuras
      // migrate: (persistedState: any, version: number) => {
      //   if (version === 0) {
      //     // Migrar de v0 a v1
      //   }
      //   return persistedState as Pick<AuthStoreState, 'authState'>;
      // },
    }
  )
);

// ============================================================================
// SELECTORS EXPORTADOS (para uso granular en componentes)
// ============================================================================

/**
 * Selectores granulares para optimización de renders
 * Componentes solo re-renderizan si la parte específica del estado cambia
 * 
 * Uso:
 * const authState = useAuthStore(selectAuthState);
 * const isAuthenticated = useAuthStore(selectIsAuthenticated);
 */

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
