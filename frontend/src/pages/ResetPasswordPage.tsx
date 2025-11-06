import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '@/api/config';

interface PasswordFeedback {
  label: string;
  valid: boolean;
}

/**
 * ResetPasswordPage - Página para restablecer contraseña con token
 * 
 * Flujo:
 * 1. Usuario llega desde email con token en URL (?token=xxx)
 * 2. Ingresa nueva contraseña con validaciones idénticas a RegisterPage
 * 3. Backend valida token, actualiza password, invalida token
 * 4. Redirect a /login con mensaje de éxito
 * 
 * Justificación OWASP A02:2021 (Cryptographic Failures):
 * - Password hasheado en backend (bcrypt 10 rounds)
 * - Token validado en servidor (expiración 24h + un solo uso)
 * - Validaciones idénticas a registro (consistencia de seguridad)
 * 
 * Justificación UX Best Practices:
 * - Feedback visual en tiempo real (balloon flotante)
 * - Confirmación de password previene typos
 * - Validación cliente reduce round-trips innecesarios
 * - Diseño consistente con RegisterPage (mejora UX cognición)
 * 
 * Justificación Accessibility (WCAG 2.1):
 * - aria-describedby vincula input con mensajes de error
 * - aria-invalid indica estado de validación
 * - role="status" + aria-live="polite" anuncia cambios sin interrumpir
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<PasswordFeedback[]>([]);
  const [showBalloon, setShowBalloon] = useState(false);

  // Criterios de validación idénticos a RegisterPage (OWASP A02:2021)
  const passwordCriteria = [
    { label: "Al menos 8 caracteres", test: (pw: string) => pw.length >= 8 },
    { label: "Al menos un número", test: (pw: string) => /\d/.test(pw) },
    { label: "Al menos una letra mayúscula", test: (pw: string) => /[A-Z]/.test(pw) },
    { label: "Al menos una letra minúscula", test: (pw: string) => /[a-z]/.test(pw) },
    { label: "Al menos un carácter especial", test: (pw: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
  ];

  // Actualizar feedback en tiempo real
  useEffect(() => {
    const feedback = passwordCriteria.map((criterion) => ({
      label: criterion.label,
      valid: criterion.test(newPassword),
    }));
    setPasswordFeedback(feedback);
  }, [newPassword]);

  // Extraer token de URL
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      toast.error('Token de recuperación no encontrado');
      navigate('/forgot-password');
      return;
    }
    setToken(tokenParam);
  }, [searchParams, navigate]);

  // Validar que password cumple todos los criterios
  const passwordValid = passwordCriteria.every((criterion) => criterion.test(newPassword));

  // Validar que passwords coinciden
  const passwordsMatch = newPassword === confirmPassword;

  // Build aria-describedby para el input de nueva contraseña
  const passwordDescribedByIds = [
    showBalloon ? 'password-balloon' : undefined,
    !passwordValid && newPassword.length > 0 ? 'password-error' : undefined,
  ].filter(Boolean).join(' ') || undefined;

  // Build aria-describedby para el input de confirmación
  const confirmDescribedBy = !passwordsMatch && confirmPassword.length > 0 ? 'confirm-error' : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación cliente (idéntica a RegisterPage)
    if (!passwordCriteria.every((criterion) => criterion.test(newPassword))) {
      setErrorMessage("La contraseña no cumple con todos los requisitos");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden");
      return;
    }

    if (!token) {
      setErrorMessage('Token de recuperación inválido');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/client/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token, 
          newPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Contraseña actualizada exitosamente', {
          duration: 3000,
        });
        
        // Redirect a login después de 1 segundo
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Contraseña actualizada. Por favor inicia sesión.' }
          });
        }, 1000);
      } else {
        // Mostrar error específico del backend
        setErrorMessage(data.message || 'Error al restablecer contraseña');
        
        // Si el token expiró, sugerir solicitar nuevo
        if (data.message?.includes('expirado')) {
          toast.error('El token ha expirado. Solicita uno nuevo.', {
            duration: 5000,
          });
        }
      }
    } catch (error) {
      setErrorMessage('Error de conexión. Por favor intenta nuevamente.');
      toast.error('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  // No renderizar hasta tener token
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Validando token...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Restablecer contraseña</CardTitle>
          <CardDescription>
            Ingresa tu nueva contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="text-red-600 text-sm">{errorMessage}</div>
            )}

            {/* Nueva contraseña con balloon (idéntico a RegisterPage) */}
            <div className="relative">
              <label 
                htmlFor="newPassword" 
                className={`block text-sm font-medium cursor-pointer w-full ${!passwordValid && newPassword.length > 0 ? 'text-red-600' : ''}`}
              >
                Nueva contraseña
              </label>
              <Input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full mt-1"
                onFocus={() => setShowBalloon(true)}
                onBlur={() => setShowBalloon(false)}
                onKeyDown={(e) => { if (e.key === 'Escape') setShowBalloon(false); }}
                aria-invalid={!passwordValid && newPassword.length > 0}
                aria-describedby={passwordDescribedByIds}
                autoFocus
                autoComplete="new-password"
              />

              {/* Mensaje de error inline */}
              {!passwordValid && newPassword.length > 0 && (
                <p id="password-error" className="text-red-600 text-sm mt-1">
                  La contraseña debe cumplir con los requerimientos
                </p>
              )}

              {/* Balloon flotante (idéntico a RegisterPage) */}
              <div
                role="status"
                aria-live="polite"
                id="password-balloon"
                className={`${showBalloon ? 'pointer-events-auto' : 'pointer-events-none'} absolute z-20 bottom-full mb-2 right-0 w-72 sm:w-80 transform transition duration-150 ease-out ${showBalloon ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
              >
                <div className="bg-white border rounded-lg shadow-md p-3 text-sm">
                  <p className="font-semibold mb-2">Requisitos de la contraseña</p>
                  <ul className="space-y-2">
                    {passwordFeedback.map((fb, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <span className={`flex items-center justify-center rounded-full w-6 h-6 ${fb.valid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {fb.valid ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </span>
                        <span className={fb.valid ? 'text-gray-500 line-through' : 'text-gray-800'}>{fb.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Confirmar contraseña (idéntico a RegisterPage) */}
            <div>
              <label 
                htmlFor="confirmPassword" 
                className={`block text-sm font-medium ${!passwordsMatch && confirmPassword.length > 0 ? 'text-red-600' : ''}`}
              >
                Confirmar contraseña
              </label>
              <Input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full"
                aria-invalid={!passwordsMatch && confirmPassword.length > 0}
                aria-describedby={confirmDescribedBy}
                autoComplete="new-password"
              />

              {!passwordsMatch && confirmPassword.length > 0 && (
                <p id="confirm-error" className="text-red-600 text-sm mt-1">
                  Las contraseñas deben coincidir
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Restablecer contraseña'
              )}
            </Button>

            <div className="text-center space-y-2">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  El enlace de recuperación expira en 24 horas
                </p>
              </div>
              
              <Button 
                asChild 
                variant="link" 
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                <Link to="/forgot-password">
                  ¿El enlace expiró? Solicita uno nuevo
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
