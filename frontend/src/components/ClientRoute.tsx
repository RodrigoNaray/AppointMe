import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, selectAuthState, selectIsLoading } from '../stores/authStore';

/**
 * ClientRoute - Ruta protegida específica para clientes
 * 
 * Verifica que:
 * 1. El usuario esté autenticado
 * 2. El tipo de usuario sea específicamente 'client'
 * 
 * Previene que administradores accedan a rutas exclusivas de clientes
 * 
 * OWASP A01:2021 - Broken Access Control
 * Implementa verificación de autorización basada en roles
 */
export default function ClientRoute() {
  const authState = useAuthStore(selectAuthState);
  const isLoading = useAuthStore(selectIsLoading);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  // Verificación estricta: debe estar autenticado Y ser tipo client
  if (!authState.isAuthenticated || authState.type !== 'client') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
