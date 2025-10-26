import { useAuthStore, selectAuthState } from '@/stores/authStore';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Mail, User, Calendar, Lock } from 'lucide-react';

/**
 * ClientProfilePage Component
 * 
 * Página de perfil del cliente autenticado:
 * - React 19: Componente funcional con hooks
 * - TypeScript: Type-safe con discriminated unions
 * - OWASP: Requiere autenticación para acceder
 * - UX: Información clara del usuario + acciones rápidas
 */
export default function ClientProfilePage() {
  const authState = useAuthStore(selectAuthState);
  const navigate = useNavigate();

  // Redireccionar si no está autenticado
  if (!authState.isAuthenticated || authState.type !== 'client') {
    return <Navigate to="/login" replace />;
  }

  const user = authState.user;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Mi Perfil</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>
            Aquí puedes ver tu información de cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nombre */}
          <div className="flex items-start gap-3 pb-4 border-b">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Nombre</p>
              <p className="text-base font-medium">{user.name}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3 pb-4 border-b">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base font-medium">{user.email}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/change-email')}
            >
              Cambiar
            </Button>
          </div>

          {/* ID de Usuario */}
          <div className="flex items-start gap-3 pb-4">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">ID de Usuario</p>
              <p className="text-sm font-mono">{user.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Seguridad */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Configuración de Seguridad</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary" onClick={() => navigate('/change-email')}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Cambiar Email
              </CardTitle>
              <CardDescription>
                Actualiza tu dirección de correo electrónico de forma segura
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary" onClick={() => navigate('/change-password')}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-5 w-5 text-green-600" />
                Cambiar Contraseña
              </CardTitle>
              <CardDescription>
                Actualiza tu contraseña para mantener tu cuenta segura
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
