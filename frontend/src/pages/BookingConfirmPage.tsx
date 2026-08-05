import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";
import { useBookingStore, selectCart, selectClearCart, selectRemoveService, selectTotalPrice, selectTotalDuration } from "@/stores/bookingStore";
import { useAuthStore, selectAuthState } from "@/stores/authStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, DollarSign, CheckCircle, AlertCircle, Loader2, Mail, ShieldAlert } from "lucide-react";
import { createBooking, cancelBooking } from "@/api/modules/bookings";
import { clientAuthService } from "@/api/modules/clientAuth";
import { RollbackConfirmModal, type RollbackItem } from "@/components/booking/RollbackConfirmModal";
import { PageContainer } from "@/components/layout/PageContainer";

interface BookingResult {
  serviceId: string;
  serviceName: string;
  bookingTime: string;
  success: boolean;
  bookingId?: string;
  rolledBack?: boolean;
  error?: string;
}

export default function BookingConfirmPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cart = useBookingStore(selectCart);
  const clearCart = useBookingStore(selectClearCart);
  const removeService = useBookingStore(selectRemoveService);
  const totalPrice = useBookingStore(selectTotalPrice);
  const totalDuration = useBookingStore(selectTotalDuration);
  const authState = useAuthStore(selectAuthState);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResults, setBookingResults] = useState<BookingResult[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [showEmailBanner, setShowEmailBanner] = useState(false);
  const [emailBannerSent, setEmailBannerSent] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [successfulItems, setSuccessfulItems] = useState<RollbackItem[]>([]);
  const [failedItems, setFailedItems] = useState<RollbackItem[]>([]);

  const dateParam = searchParams.get('date'); // YYYY-MM-DD
  const timeParam = searchParams.get('time'); // HH:mm

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

  const handleResendVerification = async () => {
    setResendingEmail(true);
    try {
      const result = await clientAuthService.resendVerification();
      if (result.success) {
        setEmailBannerSent(true);
        toast.success('Email de verificación reenviado. Revisá tu bandeja.');
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Error al reenviar la verificación. Intentá de nuevo.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleRetryAfterVerify = () => {
    setShowEmailBanner(false);
    setEmailBannerSent(false);
    setHasSubmitted(false);
    setBookingResults([]);
  };

  const getAxiosErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosErr = error as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr.response?.data?.message) return axiosErr.response.data.message;
    }
    if (error instanceof Error) {
      if (error.message.includes('Network Error')) return 'Error de conexión. Verifica tu internet.';
      return error.message;
    }
    return 'Error inesperado';
  };

  const handleRollback = async () => {
    const ids = successfulItems
      .filter((item) => item.bookingId)
      .map((item) => item.bookingId as string);
    const results = await Promise.allSettled(ids.map((id) => cancelBooking(id)));
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled') {
        setBookingResults((prev) =>
          prev.map((r) =>
            r.bookingId === ids[i] ? { ...r, rolledBack: true } : r
          )
        );
      }
    }
    const allOk = results.every((r) => r.status === 'fulfilled');
    if (allOk) {
      toast.success('Reservas canceladas correctamente.');
    } else {
      toast.error('Algunas reservas no pudieron cancelarse. Revisá el panel de administración.');
    }
    setHasSubmitted(false);
    setIsSubmitting(false);
  };

  const handleKeepPartial = () => {
    const successResults = bookingResults.filter((r) => r.success && !r.rolledBack);
    successResults.forEach((r) => removeService(r.serviceId));
    navigate('/book/success', { state: { results: successResults } });
  };

  const rollbackCreatedBookings = async (results: BookingResult[]): Promise<boolean> => {
    const createdIds = results
      .filter((r) => r.success && r.bookingId)
      .map((r) => r.bookingId as string);
    if (createdIds.length === 0) return true;

    const rollbackResults = await Promise.allSettled(createdIds.map((id) => cancelBooking(id)));
    const allOk = rollbackResults.every((r) => r.status === 'fulfilled');
    if (!allOk) {
      toast.error('No se pudieron revertir todas las reservas previas. Revisá Mis Reservas para evitar duplicados.');
    }
    return allOk;
  };

  const handleConfirmBooking = async () => {
    if (!selectedDateTime || !dateParam || !timeParam) {
      toast.error('Fecha u hora inválidas');
      return;
    }

    if (isSubmitting || hasSubmitted) return;

    setIsSubmitting(true);
    setHasSubmitted(true);
    setShowEmailBanner(false);

    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const slots = cart.map((item, index) => {
      const offset = cart
        .slice(0, index)
        .reduce((sum, i) => sum + i.service.durationMinutes * i.quantity, 0);
      const slotTime = new Date(selectedDateTime);
      slotTime.setUTCMinutes(slotTime.getUTCMinutes() + offset);
      return {
        item,
        bookingTime: slotTime.toISOString(),
      };
    });

    const apiResults = await Promise.allSettled(
      slots.map((slot) =>
        createBooking({
          serviceId: slot.item.service.id,
          bookingTime: slot.bookingTime,
          notes: '',
          clientTimezone,
        })
      )
    );

    const results: BookingResult[] = [];
    let emailNotVerified = false;

    for (let i = 0; i < apiResults.length; i++) {
      const slot = slots[i];
      const r = apiResults[i];

      if (r.status === 'fulfilled') {
        results.push({
          serviceId: slot.item.service.id,
          serviceName: slot.item.service.name,
          bookingTime: slot.bookingTime,
          success: true,
          bookingId: r.value.booking?.id,
        });
      } else if (
        r.reason?.response?.status === 403 &&
        r.reason?.response?.data?.code === 'EMAIL_NOT_VERIFIED'
      ) {
        emailNotVerified = true;
        break;
      } else {
        const errorMessage = r.reason
          ? getAxiosErrorMessage(r.reason)
          : 'Error desconocido';
        results.push({
          serviceId: slot.item.service.id,
          serviceName: slot.item.service.name,
          bookingTime: slot.bookingTime,
          success: false,
          error: errorMessage,
        });
      }
    }

    if (emailNotVerified) {
      const allRolledBack = await rollbackCreatedBookings(results);
      setBookingResults([]);
      setShowEmailBanner(true);
      if (allRolledBack) {
        setHasSubmitted(false);
      }
      setIsSubmitting(false);
      return;
    }

    setBookingResults(results);

    const successCount = results.filter((r) => r.success).length;
    const allSuccess = successCount === cart.length;

    if (allSuccess) {
      clearCart();
      navigate('/book/success', { state: { results } });
    } else if (successCount > 0) {
      setSuccessfulItems(
        results.filter((r) => r.success).map((r) => ({
          serviceId: r.serviceId,
          serviceName: r.serviceName,
          success: true,
          bookingId: r.bookingId,
        }))
      );
      setFailedItems(
        results.filter((r) => !r.success).map((r) => ({
          serviceId: r.serviceId,
          serviceName: r.serviceName,
          success: false,
          error: r.error,
        }))
      );
      setShowRollbackModal(true);
    } else {
      toast.error('No se pudo crear ninguna reserva.');
      setHasSubmitted(false);
    }

    setIsSubmitting(false);
  };

  // Loading state
  if (!dateParam || !timeParam || cart.length === 0) {
    return (
      <PageContainer fullHeight centered>
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/60" />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Confirmar Reserva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumen de fecha y hora */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3 text-foreground">
              <Calendar className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha</p>
                <p className="text-lg font-semibold">
                  {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es }) : dateParam}
                </p>
              </div>
            </div>
            <Separator className="bg-primary/20" />
            <div className="flex items-center gap-3 text-foreground">
              <Clock className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hora de inicio</p>
                <p className="text-lg font-semibold">{displayTime}</p>
                <p className="text-sm text-muted-foreground">
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
                  className="flex items-center justify-between p-3 bg-muted rounded-lg border-l-4 border-l-primary"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.service.name}</p>
                    <p className="text-sm text-muted-foreground">
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

          {/* Banner de email no verificado */}
          {showEmailBanner && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Verificá tu email antes de reservar</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Necesitamos confirmar tu dirección de email para procesar la reserva.
                    Revisá tu bandeja de entrada o solicitá un nuevo email.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={resendingEmail}
                  className="flex-1"
                >
                  {resendingEmail ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {emailBannerSent ? 'Reenviar de nuevo' : 'Reenviar verificación'}
                </Button>
                {!emailBannerSent && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleRetryAfterVerify}
                    className="text-accent"
                  >
                    Intentar de nuevo
                  </Button>
                )}
              </div>
              {emailBannerSent && (
                <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded p-2">
                  <CheckCircle className="w-4 h-4" />
                  Email enviado. Revisá tu bandeja y luego presioná "Intentar de nuevo" para reintentar la reserva.
                </div>
              )}
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between p-4 bg-success/10 border border-success/30 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-success" />
              <span className="font-semibold text-lg text-foreground">Total</span>
            </div>
            <span className="font-bold text-2xl text-success">${totalPrice.toFixed(2)}</span>
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
                      ? 'bg-success/10 border-success/30'
                      : 'bg-destructive/10 border-destructive/30'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" /> 
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{result.serviceName}</p>
                    {!result.success && result.error && (
                      <p className="text-sm text-destructive">{result.error}</p>
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
              data-testid="confirm-booking"
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
          <p className="text-sm text-muted-foreground text-center">
            Al confirmar, se crearán {cart.length} {cart.length === 1 ? 'reserva' : 'reservas'} consecutivas
            comenzando a las {displayTime}. Los servicios se reservarán uno después del otro automáticamente.
          </p>
        </CardContent>
      </Card>

      <RollbackConfirmModal
        open={showRollbackModal}
        onOpenChange={setShowRollbackModal}
        successfulItems={successfulItems}
        failedItems={failedItems}
        onRollback={handleRollback}
        onKeepPartial={handleKeepPartial}
      />
    </PageContainer>
  );
}
