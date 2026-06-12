import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { clientAuthService } from '@/api/modules/clientAuth';
import { useAuthStore, selectAuthState } from '@/stores/authStore';

/**
 * Componente para solicitar cambio de email (usuario autenticado)
 * OWASP: Requiere contraseña para confirmar identidad
 * Reutiliza estructura de ResendVerificationPage
 */
export default function ChangeEmailPage() {
  const authState = useAuthStore(selectAuthState);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Verificar si el usuario se registró con Google
  const isGoogleUser = authState.isAuthenticated && 
                       authState.type === 'client' && 
                       authState.user.googleId;

  // Verificar si el usuario está autenticado
  if (!authState.isAuthenticated || authState.type !== 'client') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-accent mx-auto mb-2" />
            <CardTitle className="text-2xl font-bold">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Debes iniciar sesión para cambiar tu email.
            </p>
            <Link to="/login">
              <Button className="w-full">Ir al Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!newEmail.includes('@')) {
      setMessage("Por favor ingresa un email válido");
      setIsSuccess(false);
      return;
    }

    if (password.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres");
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const result = await clientAuthService.requestEmailChange(newEmail, password);

      if (result.success) {
        setMessage(result.message);
        setIsSuccess(true);
        setNewEmail('');
        setPassword('');
      } else {
        setMessage(result.message);
        setIsSuccess(false);
      }
    } catch (error) {
      setMessage('Error interno del servidor. Intenta nuevamente.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Cambiar Email</CardTitle>
          <p className="text-muted-foreground mt-2">
            Email actual: <strong>{authState.user.email}</strong>
          </p>
        </CardHeader>
        <CardContent>
          {/* Bloquear cambio de email para usuarios de Google */}
          {isGoogleUser ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Cuenta vinculada con Google
                    </h3>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      Tu cuenta está autenticada con Google. El email de tu cuenta está vinculado 
                      directamente a tu cuenta de Google y no puede ser modificado desde aquí.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center mt-6">
                <Link to="/profile">
                  <Button className="w-full">
                    Volver al Perfil
                  </Button>
                </Link>
              </div>
            </div>
          ) : !isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="newEmail" className="block text-sm font-medium">
                  Nuevo Email
                </label>
                <Input
                  type="email"
                  id="newEmail"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo-email@ejemplo.com"
                  required
                  className="w-full mt-1"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    required
                    className="w-full mt-1 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Requerida para confirmar tu identidad
                </p>
              </div>

              {message && (
                <div className={`text-sm p-3 rounded ${isSuccess ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Mail className="w-4 h-4 mr-2 animate-pulse" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Solicitar Cambio de Email
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-success">
                  ¡Solicitud Enviada!
                </h3>
                <p className="text-muted-foreground mt-2">
                  {message}
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  Revisa tu bandeja de entrada del nuevo email y haz clic en el enlace de verificación.
                </p>
              </div>
              <Button
                onClick={() => {
                  setIsSuccess(false);
                  setMessage('');
                }}
                variant="outline"
                className="w-full"
              >
                Solicitar Otro Cambio
              </Button>
            </div>
          )}

          <div className="text-center mt-6">
            <Link
              to="/profile"
              className="block text-sm text-blue-500 hover:underline"
            >
              Volver al Perfil
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
