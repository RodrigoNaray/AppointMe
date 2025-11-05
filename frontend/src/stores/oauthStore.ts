import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * OAuthStore - Zustand store para preservar returnUrl durante Google OAuth
 * 
 * Justificación OWASP (HTML5 Security Cheat Sheet 2025):
 * - sessionStorage (NO localStorage): Datos se eliminan al cerrar tab
 * - No contiene PII: Solo URLs relativas (rutas del frontend)
 * - Validación: returnUrl debe empezar con '/' (previene open redirect)
 * 
 * Flujo OAuth:
 * 1. LoginPage/RegisterPage: saveReturnUrl() antes de redirect a backend
 * 2. Backend: Redirige a Google → Google callback → Backend redirect a frontend
 * 3. HomePage: useEffect lee getReturnUrl(), redirige, clearReturnUrl()
 * 
 * Referencias:
 * - OWASP HTML5 Security: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
 * - Zustand persist: https://docs.pmnd.rs/zustand/integrations/persisting-store-data
 */

// ============================================================================
// TYPES
// ============================================================================

interface OAuthStoreState {
  // Estado
  returnUrl: string | null;
  
  // Actions
  saveReturnUrl: (url: string) => void;
  getReturnUrl: () => string | null;
  clearReturnUrl: () => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useOAuthStore = create<OAuthStoreState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      returnUrl: null,
      
      // Actions
      saveReturnUrl: (url: string) => {
        // Validación OWASP: Solo aceptar rutas relativas
      if (url.startsWith('/') && !url.startsWith('//')) {
        set({ returnUrl: url });
      }
    },      getReturnUrl: () => {
        return get().returnUrl;
      },
      
      clearReturnUrl: () => {
        set({ returnUrl: null });
      },
    }),
    {
      name: 'appointmepro-oauth-storage', // Key en sessionStorage
      storage: createJSONStorage(() => sessionStorage), // sessionStorage (expira al cerrar tab)
    }
  )
);

// ============================================================================
// SELECTORES (Patrón Redux-ready)
// ============================================================================

export const selectSaveReturnUrl = (state: OAuthStoreState) => state.saveReturnUrl;
export const selectGetReturnUrl = (state: OAuthStoreState) => state.getReturnUrl;
export const selectClearReturnUrl = (state: OAuthStoreState) => state.clearReturnUrl;
