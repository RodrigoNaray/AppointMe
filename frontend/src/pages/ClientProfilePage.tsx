import { useState } from 'react';
import { useAuthStore, selectAuthState, selectIsLoading } from '@/stores/authStore';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, User, Calendar, Lock, Globe, Loader2 } from 'lucide-react';
import clientAuthService from '@/api/modules/clientAuth';
import { API_BASE_URL } from '@/api/config';

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
  const isCheckingAuth = useAuthStore(selectIsLoading);
  const navigate = useNavigate();
  const setAuthState = useAuthStore((s) => s._setAuthState);

  const [savingLanguage, setSavingLanguage] = useState(false);

  if (isCheckingAuth) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!authState.isAuthenticated || authState.type !== 'client') {
    return <Navigate to="/login" replace />;
  }

  const user = authState.user;

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setSavingLanguage(true);
    try {
      const updated = await clientAuthService.updateProfile({ emailLanguage: lang });
      setAuthState({
        type: 'client',
        user: updated,
        isAuthenticated: true,
      });
      toast.success(lang === 'en' ? 'Language updated to English' : 'Idioma actualizado a Español');
    } catch {
      toast.error('Error al actualizar el idioma');
    } finally {
      setSavingLanguage(false);
    }
  };

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

          {/* Idioma de Email */}
          <div className="flex items-start gap-3 pb-4 border-b">
            <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Idioma de notificaciones</p>
              <select
                value={user.emailLanguage ?? 'es'}
                onChange={handleLanguageChange}
                disabled={savingLanguage}
                className="mt-1 block w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
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
                <Lock className="h-5 w-5 text-success" />
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
