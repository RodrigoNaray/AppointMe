import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated, selectIsLoading } from '../stores/authStore';

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isLoading = useAuthStore(selectIsLoading);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Cargando...</p> 
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}