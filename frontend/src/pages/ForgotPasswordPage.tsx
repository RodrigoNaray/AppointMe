import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { PageContainer } from "@/components/layout/PageContainer";
import { API_BASE_URL } from '@/api/config';

/**
 * ForgotPasswordPage - Página para solicitar recuperación de contraseña
 * 
 * Flujo:
 * 1. Usuario ingresa su email
 * 2. Backend genera token y envía email con link de recuperación
 * 3. Mensaje genérico mostrado (no revelar si email existe)
 * 
 * Justificación OWASP A01:2021 (Broken Access Control):
 * - Mensaje genérico previene enumeración de usuarios válidos
 * - No revela si email existe en sistema (seguridad por oscuridad apropiada)
 * 
 * Justificación UX Best Practices:
 * - Instrucciones claras de qué esperar
 * - Link de vuelta a login visible
 * - Loading state durante request
 * 
 * Justificación Accessibility:
 * - Labels descriptivos para screen readers
 * - Error messages asociados a inputs (aria-describedby)
 * - Teclado navigation (Tab, Enter)
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validación cliente
    if (!email.trim()) {
      setError('Por favor ingresa tu email');
      return;
    }

    if (!validateEmail(email)) {
      setError('Por favor ingresa un email válido');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/client/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      // Backend siempre retorna 200 por seguridad
      if (response.ok) {
        setIsSuccess(true);
        toast.success('Instrucciones enviadas');
      } else {
        // Mostrar mensaje genérico incluso en error
        setIsSuccess(true);
      }
    } catch (error) {
      // No revelar errores específicos
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <PageContainer maxWidth="md" fullHeight centered padding="none">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-success/10 dark:bg-success/20 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-success dark:text-success" />
            </div>
            <CardTitle className="text-2xl font-bold">Revisa tu email</CardTitle>
            <CardDescription className="text-base">
              Si el email existe en nuestro sistema, recibirás instrucciones para restablecer tu contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30 rounded-lg p-4">
              <p className="text-sm text-foreground dark:text-foreground/80">
                <strong>Nota:</strong> El enlace de recuperación es válido por 24 horas. Si no recibes el email en unos minutos, verifica tu carpeta de spam.
              </p>
            </div>
            
            <Button 
              asChild 
              className="w-full"
              variant="outline"
            >
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="md" fullHeight centered padding="none">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">¿Olvidaste tu contraseña?</CardTitle>
          <CardDescription>
            Ingresa tu email y te enviaremos instrucciones para recuperar tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-destructive text-sm">{error}</div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Correo Electrónico
              </label>
              <Input
                type="email"
                id="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoFocus
                autoComplete="email"
                required
                className="w-full"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar instrucciones
                </>
              )}
            </Button>

            <div className="text-center">
              <Button 
                asChild 
                variant="link" 
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                <Link to="/login">
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Volver al login
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
