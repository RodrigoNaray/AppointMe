import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar as CalendarIcon, Clock, DollarSign } from 'lucide-react';
import { useBookingStore, selectCart, selectTotalPrice, selectTotalDuration, selectClearCart } from '@/stores/bookingStore';
import { useAuth } from '@/context/AuthContext';
import { format, isBefore, startOfToday, parse } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * BookingCalendarPage - Paso 2 + 3 fusionados del flujo de reserva
 * 
 * Permite al usuario seleccionar fecha Y horario en la misma pantalla.
 * 
 * Flujo UX optimizado:
 * 1. Fetch días disponibles del mes con totalDuration del carrito
 * 2. Auto-selecciona primer día disponible
 * 3. Muestra slots del día seleccionado automáticamente
 * 4. Usuario puede cambiar fecha → slots se actualizan
 * 5. Al seleccionar slot → verifica auth → navega a confirmación
 * 
 * Mejores prácticas:
 * - React 19: useState + useEffect con cleanup
 * - UX: Reduce clicks (fusión calendario + horarios)
 * - Performance: Batch API calls (month + first day slots)
 * - Mobile-first: Grid responsive 3 columnas
 */

export default function BookingCalendarPage() {
  const navigate = useNavigate();
  
  // Zustand store con selectores granulares
  const cart = useBookingStore(selectCart);
  const totalPrice = useBookingStore(selectTotalPrice);
  const totalDuration = useBookingStore(selectTotalDuration);
  const clearCart = useBookingStore(selectClearCart);
  
  const { authState } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const totalServices = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Protección: redirigir si carrito vacío
  useEffect(() => {
    if (cart.length === 0) {
      navigate('/book');
    }
  }, [cart, navigate]);

  // Debug: log para verificar datos del carrito
  useEffect(() => {
    console.log('[BookingCalendar] Cart:', cart);
    console.log('[BookingCalendar] Total duration:', totalDuration);
  }, [cart, totalDuration]);

  // Fetch disponibilidad mensual + auto-select primera fecha
  useEffect(() => {
    const fetchMonthAvailability = async () => {
      setLoadingMonth(true);
      try {
        const month = format(currentMonth, 'yyyy-MM');
        console.log('[BookingCalendar] Fetching availability:', { month, totalDuration });
        
        const response = await fetch(
          `http://localhost:5000/api/availability/month?month=${month}&totalDuration=${totalDuration}`
        );
        
        console.log('[BookingCalendar] Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[BookingCalendar] Error response:', errorText);
          throw new Error(`Error fetching month availability: ${response.status}`);
        }

        const days = await response.json() as string[];
        console.log('[BookingCalendar] Available days:', days);
        setAvailableDays(days);

        // Auto-seleccionar primer día disponible
        if (days.length > 0 && !selectedDate) {
          const firstDay = parse(days[0], 'yyyy-MM-dd', new Date());
          setSelectedDate(firstDay);
          console.log('[BookingCalendar] Auto-selected first day:', days[0]);
        } else if (days.length === 0) {
          console.warn('[BookingCalendar] No available days found for month:', month);
        }
      } catch (error) {
        console.error('[BookingCalendar] Error fetching month availability:', error);
        setAvailableDays([]);
      } finally {
        setLoadingMonth(false);
      }
    };

    fetchMonthAvailability();
  }, [currentMonth, totalDuration]); // No incluir selectedDate para evitar loop

  // Fetch slots cuando cambia la fecha seleccionada
  useEffect(() => {
    if (!selectedDate) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSelectedTime(null); // Reset time al cambiar fecha
      
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        // Estrategia: usar servicio con mayor duración
        const longestService = cart.reduce((prev, current) => 
          (current.service.durationMinutes > prev.service.durationMinutes) ? current : prev
        );

        const response = await fetch(
          `http://localhost:5000/api/availability?serviceId=${longestService.service.id}&date=${dateStr}`
        );
        
        if (!response.ok) {
          throw new Error('Error fetching slots');
        }

        const slots = await response.json() as string[];
        setAvailableSlots(slots);
      } catch (error) {
        console.error('Error fetching slots:', error);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDate, cart]);

  // Determinar si una fecha está disponible
  const isDateAvailable = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availableDays.includes(dateStr);
  };

  // Handler selección de fecha
  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !isDateAvailable(date)) return;
    setSelectedDate(date);
  };

  // Handler selección de horario
  const handleSelectSlot = (time: string) => {
    setSelectedTime(time);
  };

  // Handler para confirmar (verifica autenticación)
  const handleContinue = () => {
    if (!selectedTime || !selectedDate) return;

    const isClientAuthenticated = authState.isAuthenticated && authState.type === 'client';
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    if (!isClientAuthenticated) {
      // Redirigir a login con returnUrl
      const returnUrl = `/book/calendar?date=${dateStr}&time=${selectedTime}`;
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // Usuario autenticado → confirmar reserva
    navigate(`/book/confirm?date=${dateStr}&time=${selectedTime}`);
  };

  // Handler cambio de mes
  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
    setSelectedDate(undefined); // Reset selección al cambiar mes
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/book')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Servicios
          </Button>
          
          <h1 className="text-2xl sm:text-3xl font-bold">Selecciona Fecha y Horario</h1>
          <p className="text-muted-foreground mt-2">
            Elige el día y la hora que mejor te convenga
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Columna izquierda: Calendario + Slots */}
          <div className="space-y-6">
            {/* Calendario */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Calendario de Disponibilidad
                </CardTitle>
                <CardDescription>
                  {loadingMonth 
                    ? 'Cargando disponibilidad...' 
                    : `${availableDays.length} días disponibles este mes`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                {loadingMonth ? (
                  <div className="flex items-center justify-center h-[350px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    month={currentMonth}
                    onSelect={handleDateSelect}
                    onMonthChange={handleMonthChange}
                    disabled={(date) => {
                      // Deshabilitar días pasados
                      if (isBefore(date, startOfToday())) return true;
                      // Deshabilitar días sin disponibilidad
                      return !isDateAvailable(date);
                    }}
                    locale={es}
                    className="rounded-md border"
                  />
                )}
              </CardContent>
            </Card>

            {/* Horarios disponibles */}
            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Horarios Disponibles
                  </CardTitle>
                  <CardDescription>
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center h-[200px]">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-center">
                      <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No hay horarios disponibles
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                      {availableSlots.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? 'default' : 'outline'}
                          onClick={() => handleSelectSlot(time)}
                          className="h-12 text-base font-medium"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Columna derecha: Resumen sticky */}
          <Card className="lg:sticky lg:top-20 h-fit">
            <CardHeader>
              <CardTitle>Resumen de Reserva</CardTitle>
              <CardDescription>
                Revisa los detalles de tu cita
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fecha y hora seleccionada */}
              {selectedDate && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Fecha</span>
                  </div>
                  <p className="text-sm">
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                  </p>
                  
                  {selectedTime && (
                    <>
                      <div className="flex items-center gap-2 mt-3 mb-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Hora</span>
                      </div>
                      <p className="text-lg font-semibold">{selectedTime}</p>
                    </>
                  )}
                </div>
              )}

              {/* Lista de servicios */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Servicios ({totalServices})
                </h3>
                {cart.map((item) => (
                  <div
                    key={item.service.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="text-sm">
                      <p className="font-medium">{item.service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        x{item.quantity}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">
                        ${item.service.price * item.quantity}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.service.durationMinutes * item.quantity} min
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Duración total</span>
                  </div>
                  <span className="font-semibold">{totalDuration} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Total</span>
                  </div>
                  <span className="font-semibold text-lg">${totalPrice}</span>
                </div>
              </div>

              {/* Botones */}
              <div className="space-y-2 pt-4">
                <Button
                  onClick={handleContinue}
                  disabled={!selectedTime}
                  className="w-full"
                >
                  {authState.isAuthenticated && authState.type === 'client' 
                    ? 'Confirmar Reserva'
                    : 'Continuar (Iniciar Sesión)'
                  }
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearCart}
                >
                  Limpiar Carrito
                </Button>

                {!authState.isAuthenticated && selectedTime && (
                  <p className="text-xs text-center text-muted-foreground">
                    Necesitas iniciar sesión para continuar
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}