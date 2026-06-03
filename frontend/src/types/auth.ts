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
  googleId?: string | null;
  emailLanguage?: string;
  type: 'client';
}

// Estado de autenticación usando discriminated unions para type safety
export type AuthState = 
  | { type: 'admin'; user: AdminUser; isAuthenticated: true }
  | { type: 'client'; user: ClientUser; isAuthenticated: true } 
  | { type: null; user: null; isAuthenticated: false };