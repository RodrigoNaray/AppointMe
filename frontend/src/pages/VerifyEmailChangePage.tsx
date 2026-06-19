import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { clientAuthService } from '@/api/modules/clientAuth';
import { PageContainer } from "@/components/layout/PageContainer";

/**
 * Página para verificar el cambio de email mediante token
 * Reutiliza estructura de EmailVerificationPage
 */
export default function VerifyEmailChangePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const hasVerified = useRef(false); // Prevenir ejecución múltiple

  useEffect(() => {
    const verifyEmailChange = async () => {
      // Prevenir múltiples ejecuciones (React StrictMode causa double render)
      if (hasVerified.current) {
        return;
      }
      hasVerified.current = true;

      if (!token) {
        setMessage('Token de verificación no válido');
        setIsSuccess(false);
        setIsLoading(false);
        return;
      }

      try {
        const result = await clientAuthService.verifyEmailChange(token);

        if (result.success) {
          setMessage(result.message);
          setIsSuccess(true);
        } else {
          setMessage(result.message);
          setIsSuccess(false);
        }
      } catch (error) {
        setMessage('Error al verificar el cambio de email. Intenta nuevamente.');
        setIsSuccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmailChange();
  }, []); // Dependencias vacías, solo ejecutar una vez

  if (isLoading) {
    return (
      <PageContainer maxWidth="md" fullHeight centered padding="none">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <Loader className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold">Verificando...</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Por favor espera mientras verificamos tu nuevo email.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="md" fullHeight centered padding="none">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          {isSuccess ? (
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          )}
          <CardTitle className="text-2xl font-bold">
            {isSuccess ? '¡Email Actualizado!' : 'Error en Verificación'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className={`text-sm ${isSuccess ? 'text-success' : 'text-destructive'}`}>
            {message}
          </p>

          {isSuccess ? (
            <>
              <p className="text-sm text-muted-foreground">
                Tu dirección de email ha sido actualizada exitosamente. 
                Por favor inicia sesión nuevamente con tu nuevo email.
              </p>
              <Link to="/login">
                <Button className="w-full">Ir al Login</Button>
              </Link>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Link to="/change-email">
                  <Button className="w-full">Solicitar Nuevo Cambio</Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" className="w-full">Volver al Login</Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
