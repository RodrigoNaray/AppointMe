import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Home, User, Clock, ArrowRight } from "lucide-react";

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

    return () => clearInterval(countdown);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/');
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-12 sm:py-16">
        {/* Icono de éxito */}
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-accent/10 p-5 ring-4 ring-accent/5">
            <CheckCircle className="h-12 w-12 text-accent" strokeWidth={1.5} />
          </div>
        </div>

        {/* Título y subtítulo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3" data-testid="success-title">
            Reserva Confirmada
          </h1>
          <p className="text-base text-muted-foreground">
            {bookingCount === 1
              ? 'Tu reserva ha sido creada exitosamente'
              : `Tus ${bookingCount} reservas han sido creadas exitosamente`}
          </p>
        </div>

        {/* Detalles de reservas */}
        {stateResults && stateResults.length > 0 && (
          <div className="space-y-3 mb-8">
            {stateResults.map((r) => {
              const dt = parseISO(r.bookingTime);
              return (
                <div
                  key={r.bookingId || r.serviceId}
                  className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{r.serviceName}</p>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(dt, "dd/MM/yyyy", { locale: es })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(dt, "HH:mm", { locale: es })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mensaje informativo */}
        <div className="rounded-xl border border-border bg-card p-4 mb-8">
          <p className="text-sm text-muted-foreground text-center">
            Recibirás un correo de confirmación con los detalles de tu{bookingCount === 1 ? '' : 's'} reserva{bookingCount === 1 ? '' : 's'}.
            Puedes revisar y gestionar tu{bookingCount === 1 ? '' : 's'} reserva{bookingCount === 1 ? '' : 's'} desde tu perfil.
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col gap-3 mb-8">
          <Button
            onClick={() => navigate('/client/bookings')}
            className="h-12 text-base font-semibold"
            data-testid="go-to-bookings"
          >
            <User className="h-4 w-4 mr-2" />
            Ver Mis Reservas
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => navigate('/book/calendar')}
              variant="outline"
              className="h-11"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Nueva Reserva
            </Button>

            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="h-11"
            >
              <Home className="h-4 w-4 mr-2" />
              Volver al Inicio
            </Button>
          </div>
        </div>

        {/* Auto-redirect sutil */}
        <p className="text-center text-xs text-muted-foreground">
          Redirigiendo al inicio en {secondsLeft}s
        </p>
      </div>
    </div>
  );
}
