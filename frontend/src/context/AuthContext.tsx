import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import apiClient from '../api/client';
import { LoginDto } from '../types/auth'; 


interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); 

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const response = await apiClient.get<{ user: User }>('/auth/profile');
        setUser(response.data.user); 
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserStatus();
  }, []); 

  

  const login = async (data: LoginDto) => {
    try {
      await apiClient.post('api/auth/login', data);
      
      const response = await apiClient.get<{ user: User }>('/auth/profile');
      setUser(response.data.user);
      
    } catch (error) {
      setUser(null);

      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('api/auth/logout');
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout
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