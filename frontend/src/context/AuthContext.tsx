// frontend/src/context/AuthContext.tsx
import { createContext, useState, useContext, ReactNode } from 'react';


interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  // Añadiremos más funciones como login, logout, etc. aquí
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Por ahora, el estado inicial es 'no logueado'
  const [user, setUser] = useState<User | null>(null);

  // El valor que nuestro contexto proveerá
  const value = {
    user,
    isAuthenticated: !!user, // Es 'true' si user no es null, 'false' si es null
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};