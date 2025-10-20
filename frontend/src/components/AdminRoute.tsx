import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AdminRoute - Ruta protegida específica para administradores
 * 
 * Verifica que:
 * 1. El usuario esté autenticado
 * 2. El tipo de usuario sea específicamente 'admin'
 * 
 * Previene que clientes autenticados accedan a rutas administrativas
 * 
 * OWASP A01:2021 - Broken Access Control
 * Implementa verificación de autorización basada en roles
 */
export default function AdminRoute() {
  const { authState, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  // Verificación estricta: debe estar autenticado Y ser tipo admin
  if (!authState.isAuthenticated || authState.type !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
