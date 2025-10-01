export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  phone: string;
  password: string;
}

// Tipos de usuario usando discriminated unions
export interface AdminUser {
  id: string;
  email: string;
  type: 'admin';
}

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'client';
}

// Estado de autenticación usando discriminated unions para type safety
export type AuthState = 
  | { type: 'admin'; user: AdminUser; isAuthenticated: true }
  | { type: 'client'; user: ClientUser; isAuthenticated: true } 
  | { type: null; user: null; isAuthenticated: false };

// Contexto de autenticación dual
export interface AuthContextType {
  authState: AuthState;
  isLoading: boolean;
  
  // Funciones de admin
  loginAdmin: (data: LoginDto) => Promise<void>;
  logoutAdmin: () => Promise<void>;
  
  // Funciones de cliente
  loginClient: (data: LoginDto) => Promise<void>;
  registerClient: (data: RegisterDto) => Promise<void>;
  logoutClient: () => Promise<void>;
  
  // Función de logout general
  logout: () => Promise<void>;

  // Backward compatibility - deprecado pero mantenido
  /** @deprecated Use loginAdmin instead */
  login: (data: LoginDto) => Promise<void>;
  /** @deprecated Use authState.isAuthenticated instead */
  isAuthenticated: boolean;
  /** @deprecated Use authState.user instead */
  user: AdminUser | ClientUser | null;
}