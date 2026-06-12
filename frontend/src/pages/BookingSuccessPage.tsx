import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Home, User, Clock } from "lucide-react";

export interface BookingResultData {
  serviceId: string;
  serviceName: string;
  bookingTime: string;
  success: boolean;
  bookingId?: string;
  rolledBack?: boolean;
  error?: string;
}

export default function BookingSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [secondsLeft, setSecondsLeft] = useState(10);

  const stateResults = (location.state as { results?: BookingResultData[] } | null)?.results;
  
  const countParam = searchParams.get('count');
  const bookingCount = stateResults
    ? stateResults.length
    : countParam && /^\d+$/.test(countParam)
      ? parseInt(countParam, 10)
      : 1;

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
      <Card className="border-2 border-success/30 shadow-lg">
        <CardHeader className="text-center pb-4">
          {/* Icono de éxito */}
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-success/10 p-4">
              <CheckCircle className="w-16 h-16 text-success" />
            </div>
          </div>
          
          <CardTitle className="text-3xl font-bold text-success mb-2" data-testid="success-title">
            ¡Reserva Confirmada!
          </CardTitle>
          <p className="text-lg text-muted-foreground">
            {bookingCount === 1
              ? 'Tu reserva ha sido creada exitosamente'
              : `Tus ${bookingCount} reservas han sido creadas exitosamente`}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Detalle de servicios reservados */}
          {stateResults && stateResults.length > 0 && (
            <div className="space-y-2">
              {stateResults.map((r) => {
                const dt = parseISO(r.bookingTime);
                return (
                  <div
                    key={r.bookingId || r.serviceId}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg border"
                  >
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{r.serviceName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {format(dt, "HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mensaje informativo */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <p className="text-sm text-foreground text-center">
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
              data-testid="go-to-bookings"
            >
              <User className="w-4 h-4 mr-2" />
              Ver Mis Reservas
            </Button>
          </div>

          {/* Nota de auto-redirect con contador */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground/60 mb-2">
              Redirigiendo al inicio en:
            </p>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted border-2 border-border">
              <span className="text-lg font-bold text-foreground">{secondsLeft}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
