import { createContext, useState, useContext, ReactNode, useEffect, useMemo, useCallback } from 'react';
import apiClient from '../api/client';
import clientAuthService from '../api/clientAuth';
import type { 
  LoginDto, 
  RegisterDto, 
  AuthState, 
  AuthContextType, 
  AdminUser 
} from '../types/auth';

/**
 * AuthContext refactorizado para manejar dual sessions (Admin + Client)
 * Implementación siguiendo mejores prácticas React 2025:
 * - Discriminated unions para type safety
 * - Optimización de re-renders con useMemo/useCallback
 * - Preparado para migración futura a Redux
 * - Backward compatibility mantenida
 */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Estado unificado usando discriminated unions
  const [authState, setAuthState] = useState<AuthState>({ 
    type: null, 
    user: null, 
    isAuthenticated: false 
  });
  const [isLoading, setIsLoading] = useState(true);

  // Función para verificar sesión existente al inicializar
  const checkExistingSession = useCallback(async () => {
    try {
      // Intentar obtener sesión de admin primero
      try {
        const adminResponse = await apiClient.get<{ user: AdminUser }>('auth/profile');
        setAuthState({
          type: 'admin',
          user: { ...adminResponse.data.user, type: 'admin' as const },
          isAuthenticated: true
        });
        return;
      } catch (adminError) {
        // Admin no autenticado, intentar cliente
      }

      // Intentar obtener sesión de cliente
      try {
        const clientUser = await clientAuthService.getProfile();
        setAuthState({
          type: 'client',
          user: clientUser,
          isAuthenticated: true
        });
        return;
      } catch (clientError) {
        // Cliente no autenticado
      }

      // Ninguna sesión activa
      setAuthState({ type: null, user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Error checking existing session:', error);
      setAuthState({ type: null, user: null, isAuthenticated: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkExistingSession();
  }, [checkExistingSession]);

  // Funciones de autenticación de admin
  const loginAdmin = useCallback(async (data: LoginDto) => {
    try {
      await apiClient.post('auth/login', data);
      const response = await apiClient.get<{ user: AdminUser }>('auth/profile');
      
      setAuthState({
        type: 'admin',
        user: { ...response.data.user, type: 'admin' as const },
        isAuthenticated: true
      });
    } catch (error) {
      setAuthState({ type: null, user: null, isAuthenticated: false });
      throw error;
    }
  }, []);

  const logoutAdmin = useCallback(async () => {
    try {
      await apiClient.post('auth/logout');
    } finally {
      // Solo limpiar si era admin autenticado
      if (authState.type === 'admin') {
        setAuthState({ type: null, user: null, isAuthenticated: false });
      }
    }
  }, [authState.type]);

  // Funciones de autenticación de cliente
  const loginClient = useCallback(async (data: LoginDto) => {
    try {
      const clientUser = await clientAuthService.login(data);
      
      setAuthState({
        type: 'client',
        user: clientUser,
        isAuthenticated: true
      });
    } catch (error) {
      setAuthState({ type: null, user: null, isAuthenticated: false });
      throw error;
    }
  }, []);

  const registerClient = useCallback(async (data: RegisterDto) => {
    try {
      const clientUser = await clientAuthService.register(data);
      
      setAuthState({
        type: 'client',
        user: clientUser,
        isAuthenticated: true
      });
    } catch (error) {
      setAuthState({ type: null, user: null, isAuthenticated: false });
      throw error;
    }
  }, []);

  const logoutClient = useCallback(async () => {
    try {
      await clientAuthService.logout();
    } finally {
      // Solo limpiar si era cliente autenticado
      if (authState.type === 'client') {
        setAuthState({ type: null, user: null, isAuthenticated: false });
      }
    }
  }, [authState.type]);

  // Función de logout general (mantiene backward compatibility)
  const logout = useCallback(async () => {
    if (authState.type === 'admin') {
      await logoutAdmin();
    } else if (authState.type === 'client') {
      await logoutClient();
    }
  }, [authState.type, logoutAdmin, logoutClient]);

  // Backward compatibility - función login que asume admin por defecto
  const login = useCallback(async (data: LoginDto) => {
    console.warn('login() is deprecated, use loginAdmin() instead');
    await loginAdmin(data);
  }, [loginAdmin]);

  // Memoización del valor del contexto para optimizar re-renders
  const contextValue = useMemo<AuthContextType>(() => ({
    authState,
    isLoading,
    loginAdmin,
    logoutAdmin,
    loginClient,
    registerClient,
    logoutClient,
    logout,
    // Backward compatibility
    login,
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
  }), [
    authState,
    isLoading,
    loginAdmin,
    logoutAdmin,
    loginClient,
    registerClient,
    logoutClient,
    logout,
    login,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook genérico (backward compatibility)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Hooks especializados siguiendo mejores prácticas 2025
export const useAdminAuth = () => {
  const context = useAuth();
  
  return {
    isAdminAuthenticated: context.authState.type === 'admin',
    adminUser: context.authState.type === 'admin' ? context.authState.user : null,
    loginAdmin: context.loginAdmin,
    logoutAdmin: context.logoutAdmin,
    isLoading: context.isLoading,
  };
};

export const useClientAuth = () => {
  const context = useAuth();
  
  return {
    isClientAuthenticated: context.authState.type === 'client',
    clientUser: context.authState.type === 'client' ? context.authState.user : null,
    loginClient: context.loginClient,
    registerClient: context.registerClient,
    logoutClient: context.logoutClient,
    isLoading: context.isLoading,
  };
};

export const useCurrentUser = () => {
  const context = useAuth();
  
  return {
    user: context.authState.user,
    userType: context.authState.type,
    isAuthenticated: context.authState.isAuthenticated,
    isLoading: context.isLoading,
    logout: context.logout,
  };
};