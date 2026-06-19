import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { clientAuthService } from '@/api/modules/clientAuth';
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuthStore, selectAuthState } from '@/stores/authStore';

/**
 * Componente para reenviar email de verificación (usuario autenticado)
 * OWASP A01:2021 - Requiere autenticación, no acepta email del usuario
 */
export default function ResendVerificationPage() {
  const authState = useAuthStore(selectAuthState);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Verificar si el usuario está autenticado
  if (!authState.isAuthenticated || authState.type !== 'client') {
    return (
    <PageContainer maxWidth="md" fullHeight centered padding="none">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-accent mx-auto mb-2" />
            <CardTitle className="text-2xl font-bold">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Debes iniciar sesión para reenviar el email de verificación.
            </p>
            <Link to="/login">
              <Button className="w-full">Ir al Login</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const handleResend = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const result = await clientAuthService.resendVerification();
      
      if (result.success) {
        setMessage(result.message);
        setIsSuccess(true);
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
    <PageContainer maxWidth="md" fullHeight centered padding="none">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reenviar Verificación</CardTitle>
          <p className="text-muted-foreground mt-2">
            Email registrado: <strong>{authState.user.email}</strong>
          </p>
        </CardHeader>
        <CardContent>
          {!isSuccess ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Si no recibiste el email de verificación, puedes solicitar uno nuevo.
                Se enviará a tu correo registrado.
              </p>

              {message && (
                <div className={`text-sm p-3 rounded ${isSuccess ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {message}
                </div>
              )}

              <Button 
                onClick={handleResend}
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Mail className="w-4 h-4 mr-2 animate-pulse" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Reenviar Email de Verificación
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-success">
                  ¡Email Enviado!
                </h3>
                <p className="text-muted-foreground mt-2">
                  {message}
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  Revisa tu bandeja de entrada y spam.
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
                Enviar Nuevamente
              </Button>
            </div>
          )}

          <div className="text-center mt-6">
            <Link 
              to="/login" 
              className="block text-sm text-blue-500 hover:underline"
            >
              Volver al Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}