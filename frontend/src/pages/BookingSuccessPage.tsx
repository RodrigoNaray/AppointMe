import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Home, User } from "lucide-react";

/**
 * BookingSuccessPage - Página de confirmación exitosa de reservas
 * 
 * Flujo:
 * 1. Se accede después de crear reservas exitosamente
 * 2. Lee `count` de query params (cantidad de reservas creadas)
 * 3. Muestra mensaje de éxito y opciones de navegación
 * 4. Redirige automáticamente al home después de 10 segundos
 * 
 * Seguridad OWASP (2025):
 * - Validación de query params (solo números positivos)
 * - No expone información sensible (solo cantidad de reservas)
 * - Timeout automático previene stale pages
 * 
 * React Best Practices:
 * - useSearchParams para query params type-safe
 * - Cleanup de timeout en useEffect
 * - shadcn-ui componentes accesibles
 * 
 * Referencias:
 * - React Router 7: https://reactrouter.com/en/main/hooks/use-search-params
 * - OWASP Input Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
 */

export default function BookingSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [secondsLeft, setSecondsLeft] = useState(10);
  
  // Validar query param count (cantidad de reservas creadas)
  const countParam = searchParams.get('count');
  const bookingCount = countParam && /^\d+$/.test(countParam) ? parseInt(countParam, 10) : 1;

  // Countdown timer visual (actualiza cada segundo)
  useEffect(() => {
    const countdown = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown); // Cleanup
  }, []);

  // Auto-redirect al home después de 10 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/');
    }, 10000);

    return () => clearTimeout(timer); // Cleanup
  }, [navigate]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="border-2 border-green-200 shadow-lg">
        <CardHeader className="text-center pb-4">
          {/* Icono de éxito */}
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
          </div>
          
          <CardTitle className="text-3xl font-bold text-green-700 mb-2">
            ¡Reserva Confirmada!
          </CardTitle>
          <p className="text-lg text-gray-600">
            {bookingCount === 1
              ? 'Tu reserva ha sido creada exitosamente'
              : `Tus ${bookingCount} reservas han sido creadas exitosamente`}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Mensaje informativo */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 text-center">
              Recibirás un correo de confirmación con los detalles de tu{bookingCount === 1 ? '' : 's'} reserva{bookingCount === 1 ? '' : 's'}.
              Puedes revisar y gestionar tu{bookingCount === 1 ? '' : 's'} reserva{bookingCount === 1 ? '' : 's'} desde tu perfil.
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Volver al Inicio
            </Button>
            
            <Button
              onClick={() => navigate('/book/calendar')}
              variant="outline"
              className="flex-1"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Nueva Reserva
            </Button>
            
            <Button
              onClick={() => navigate('/client/bookings')}
              className="flex-1"
            >
              <User className="w-4 h-4 mr-2" />
              Ver Mis Reservas
            </Button>
          </div>

          {/* Nota de auto-redirect con contador */}
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-2">
              Redirigiendo al inicio en:
            </p>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 border-2 border-gray-300">
              <span className="text-lg font-bold text-gray-700">{secondsLeft}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
