import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { clientAuthService } from '@/api/clientAuth';

export default function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationState, setVerificationState] = useState<{
    status: 'loading' | 'success' | 'error';
    message: string;
  }>({
    status: 'loading',
    message: 'Verificando email...'
  });

  const token = searchParams.get('token');
  const hasVerified = useRef(false); // Prevenir ejecución múltiple

  useEffect(() => {
    const verifyEmail = async () => {
      // Prevenir múltiples ejecuciones (React StrictMode causa double render)
      if (hasVerified.current) {
        return;
      }
      hasVerified.current = true;

      if (!token) {
        setVerificationState({
          status: 'error',
          message: 'Token de verificación no encontrado en la URL'
        });
        return;
      }

      try {
        const result = await clientAuthService.verifyEmail(token);
        
        if (result.success) {
          setVerificationState({
            status: 'success',
            message: result.message
          });
          
          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setVerificationState({
            status: 'error',
            message: result.message
          });
        }
      } catch (error) {
        setVerificationState({
          status: 'error',
          message: 'Error interno del servidor. Intenta nuevamente.'
        });
      }
    };

    verifyEmail();
  }, []); // Dependencias vacías, solo ejecutar una vez

  const getIcon = () => {
    switch (verificationState.status) {
      case 'loading':
        return <Loader className="w-16 h-16 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (verificationState.status) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Verificación de Email</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="flex justify-center">
            {getIcon()}
          </div>
          
          <div>
            <h3 className={`text-lg font-semibold ${getStatusColor()}`}>
              {verificationState.status === 'loading' && 'Verificando...'}
              {verificationState.status === 'success' && '¡Verificación Exitosa!'}
              {verificationState.status === 'error' && 'Error en la Verificación'}
            </h3>
            <p className="text-gray-600 mt-2">
              {verificationState.message}
            </p>
          </div>

          {verificationState.status === 'success' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Serás redirigido al login en unos segundos...
              </p>
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full"
              >
                Ir al Login Ahora
              </Button>
            </div>
          )}

          {verificationState.status === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/login')}
                className="w-full"
              >
                Ir al Login
              </Button>
              <Button 
                onClick={() => navigate('/resend-verification')}
                variant="outline" 
                className="w-full"
              >
                Solicitar Nuevo Link
              </Button>
              <Link 
                to="/register" 
                className="block text-sm text-gray-500 hover:underline text-center"
              >
                Volver al Registro
              </Link>
            </div>
          )}

          {verificationState.status === 'loading' && (
            <p className="text-sm text-gray-500">
              Por favor espera mientras verificamos tu email...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}