import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";
import { useBookingStore, selectCart, selectClearCart, selectTotalPrice, selectTotalDuration } from "@/stores/bookingStore";
import { useAuthStore, selectAuthState } from "@/stores/authStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, DollarSign, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/api/config";

interface BookingResult {
  serviceId: string;
  serviceName: string;
  success: boolean;
  bookingId?: string;
  error?: string;
}

export default function BookingConfirmPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cart = useBookingStore(selectCart);
  const clearCart = useBookingStore(selectClearCart);
  const totalPrice = useBookingStore(selectTotalPrice);
  const totalDuration = useBookingStore(selectTotalDuration);
  const authState = useAuthStore(selectAuthState);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResults, setBookingResults] = useState<BookingResult[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);

  // Leer y validar query params
  const dateParam = searchParams.get('date'); // YYYY-MM-DD
  const timeParam = searchParams.get('time'); // HH:mm

  // Validación OWASP: Query params deben existir y tener formato válido
  // IMPORTANTE: Solo ejecutar validaciones una vez para evitar toasts repetidos
  useEffect(() => {
    if (hasValidated) return;
    
    if (!dateParam || !timeParam) {
      toast.error('Parámetros de fecha/hora faltantes');
      navigate('/book');
      setHasValidated(true);
      return;
    }

    // Validar formato fecha (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      toast.error('Formato de fecha inválido');
      navigate('/book');
      setHasValidated(true);
      return;
    }

    // Validar formato hora (HH:mm)
    if (!/^\d{2}:\d{2}$/.test(timeParam)) {
      toast.error('Formato de hora inválido');
      navigate('/book');
      setHasValidated(true);
      return;
    }

    // Validar que el carrito no esté vacío (solo en primera carga)
    if (cart.length === 0 && !hasSubmitted) {
      toast.error('El carrito está vacío');
      navigate('/book');
      setHasValidated(true);
      return;
    }

    // Validar autenticación
    if (authState.type !== 'client') {
      toast.error('Debes iniciar sesión para confirmar la reserva');
      navigate(`/login?returnUrl=${encodeURIComponent(`/book/confirm?date=${dateParam}&time=${timeParam}`)}`);
      setHasValidated(true);
      return;
    }
    
    setHasValidated(true);
  }, [dateParam, timeParam, cart.length, authState.type, navigate, hasValidated, hasSubmitted]);

  // Parsear fecha y hora en UTC (CRÍTICO: backend espera UTC)
  const selectedDate = dateParam ? parse(dateParam, 'yyyy-MM-dd', new Date()) : null;
  const selectedDateTime = selectedDate && timeParam
    ? new Date(`${dateParam}T${timeParam}:00.000Z`) // Construir ISO string en UTC
    : null;
  
  // Convertir timeParam (UTC) a hora local para mostrar al usuario
  const displayTime = selectedDateTime 
    ? format(selectedDateTime, 'HH:mm') // format() convierte automáticamente a local timezone
    : timeParam;

  const handleConfirmBooking = async () => {
    if (!selectedDateTime || !dateParam || !timeParam) {
      toast.error('Fecha u hora inválidas');
      return;
    }

    if (isSubmitting || hasSubmitted) return;

    setIsSubmitting(true);
    setHasSubmitted(true);

    try {
      const results: BookingResult[] = [];
      let successCount = 0;
      let failureCount = 0;

      // Acumulador de tiempo para reservas escalonadas
      let accumulatedMinutes = 0;

      // Crear un booking por cada servicio en el carrito (escalonados secuencialmente)
      // Backend API: POST /api/bookings/create { serviceId, bookingTime, notes }
      for (const item of cart) {
        try {
          // Calcular hora de inicio escalonada: hora base + duración acumulada
          const escalatedDateTime = new Date(selectedDateTime);
          escalatedDateTime.setUTCMinutes(escalatedDateTime.getUTCMinutes() + accumulatedMinutes);
          const bookingTime = escalatedDateTime.toISOString();
          
          // Detectar timezone del navegador del usuario (IANA format)
          // Justificación: Backend formatea emails con timezone correcto del cliente
          // Ejemplo: 'America/Argentina/Buenos_Aires', 'America/New_York', 'Europe/Madrid'
          const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          
          const payload = {
            serviceId: item.service.id,
            bookingTime,
            notes: '', // Opcional: agregar campo de notas en futuro
            clientTimezone, // Timezone IANA para formatear emails correctamente
          };
          
          // Construir URL correctamente (API_BASE_URL ya incluye /api, no agregar / al inicio)
          const url = `${API_BASE_URL}/bookings/create`;
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Enviar cookies HttpOnly (JWT)
            body: JSON.stringify(payload),
          });

          let data;
          try {
            const responseText = await response.text();
            data = JSON.parse(responseText);
          } catch (parseError) {
            throw new Error(`Invalid response from server (${response.status}): ${response.statusText}`);
          }

          if (response.ok && data.success) {
            results.push({
              serviceId: item.service.id,
              serviceName: item.service.name,
              success: true,
              bookingId: data.booking?.id,
            });
            successCount++;
            
            // Acumular duración para escalonar siguiente reserva
            accumulatedMinutes += item.service.durationMinutes * item.quantity;
          } else {
            // Error del backend (409 conflicto, 400 validación, etc.)
            results.push({
              serviceId: item.service.id,
              serviceName: item.service.name,
              success: false,
              error: data.message || 'Error desconocido',
            });
            failureCount++;
            
            // IMPORTANTE: NO acumular duración en caso de fallo (no reservar siguientes servicios)
            break; // Detener creación de reservas subsiguientes si falla una
          }
        } catch (error) {
          // Error de red o parsing
          console.error('Error creating booking:', error);
          
          // Mensajes de error amigables para el usuario
          let userFriendlyError = 'Error al procesar la reserva';
          
          if (error instanceof Error) {
            if (error.message.includes('404')) {
              userFriendlyError = 'Servicio no encontrado. Por favor, contacta soporte.';
            } else if (error.message.includes('401') || error.message.includes('403')) {
              userFriendlyError = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
            } else if (error.message.includes('500')) {
              userFriendlyError = 'Error del servidor. Intenta nuevamente más tarde.';
            } else if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch')) {
              userFriendlyError = 'Error de conexión. Verifica tu internet.';
            }
          }
          
          results.push({
            serviceId: item.service.id,
            serviceName: item.service.name,
            success: false,
            error: userFriendlyError,
          });
          failureCount++;
          
          // IMPORTANTE: Detener proceso si hay error de red/servidor
          break;
        }
      }

      setBookingResults(results);

      // Mostrar resultado
      if (successCount === cart.length) {
        // Todas las reservas exitosas
        clearCart();
        
        // Redirigir a página de éxito inmediatamente
        navigate(`/book/success?count=${successCount}`);
      } else if (successCount > 0) {
        // Algunas reservas exitosas, otras fallidas
        toast.error(`${successCount} reservas exitosas, ${failureCount} fallidas. Revisa los detalles.`);
      } else {
        // Todas fallidas
        toast.error('No se pudo crear ninguna reserva. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error confirmando reservas:', error);
      toast.error('Error inesperado al confirmar reservas');
      setHasSubmitted(false); // Permitir reintentar
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (!dateParam || !timeParam || cart.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Confirmar Reserva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumen de fecha y hora */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3 text-blue-900">
              <Calendar className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium text-blue-700">Fecha</p>
                <p className="text-lg font-semibold">
                  {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es }) : dateParam}
                </p>
              </div>
            </div>
            <Separator className="bg-blue-200" />
            <div className="flex items-center gap-3 text-blue-900">
              <Clock className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium text-blue-700">Hora de inicio</p>
                <p className="text-lg font-semibold">{displayTime}</p>
                <p className="text-sm text-blue-600">
                  Duración total: {totalDuration} minutos
                </p>
              </div>
            </div>
          </div>

          {/* Lista de servicios */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Servicios seleccionados</h3>
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.service.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.service.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.service.durationMinutes} min
                      {item.quantity > 1 && ` × ${item.quantity}`}
                    </p>
                  </div>
                  <p className="font-semibold text-lg">
                    ${(item.service.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-700" />
              <span className="font-semibold text-lg text-green-900">Total</span>
            </div>
            <span className="font-bold text-2xl text-green-700">${totalPrice.toFixed(2)}</span>
          </div>

          {/* Resultados de las reservas (después de submit) */}
          {bookingResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Resultado de las reservas</h3>
              {bookingResults.map((result) => (
                <div
                  key={result.serviceId}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{result.serviceName}</p>
                    {!result.success && result.error && (
                      <p className="text-sm text-red-600">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate('/book/calendar')}
              disabled={isSubmitting || hasSubmitted}
              className="flex-1"
            >
              Volver
            </Button>
            <Button
              onClick={handleConfirmBooking}
              disabled={isSubmitting || hasSubmitted}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : hasSubmitted ? (
                'Reservas creadas'
              ) : (
                'Confirmar Reserva'
              )}
            </Button>
          </div>

          {/* Nota informativa */}
          <p className="text-sm text-gray-500 text-center">
            Al confirmar, se crearán {cart.length} {cart.length === 1 ? 'reserva' : 'reservas'} consecutivas
            comenzando a las {displayTime}. Los servicios se reservarán uno después del otro automáticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
