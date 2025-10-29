import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar as CalendarIcon, Clock, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBookingStore, selectCart, selectTotalPrice, selectTotalDuration, selectClearCart } from '@/stores/bookingStore';
import { useAuthStore, selectAuthState } from '@/stores/authStore';
import { format, isBefore, startOfToday, parse, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { getBookingRules } from '@/api/settings';
import { API_BASE_URL } from '@/api/config';

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
 * Timezone Strategy (CRÍTICO):
 * - Backend siempre trabaja en UTC
 * - Slots recibidos del API están en formato "HH:mm" UTC
 * - Frontend convierte UTC → Local timezone para display
 * - Al enviar: Local timezone → UTC ISO string
 * 
 * Mejores prácticas:
 * - React 19: useState + useEffect con cleanup
 * - UX: Reduce clicks (fusión calendario + horarios)
 * - Performance: Batch API calls (month + first day slots)
 * - Mobile-first: Grid responsive 3 columnas
 * - Timezone: Mostrar hora local, almacenar UTC (best practice internacional)
 */

/**
 * Convierte slot UTC "HH:mm" a hora local del navegador
 * @param slotUTC - Slot en formato "HH:mm" UTC (ej: "09:00" = 09:00 UTC)
 * @param date - Fecha base para el slot
 * @returns Hora local en formato "HH:mm" (ej: "06:00" para UTC-3)
 */
function convertSlotUTCToLocal(slotUTC: string, date: Date): string {
  const [hours, minutes] = slotUTC.split(':').map(Number);
  
  // Crear fecha UTC explícita
  const utcDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0
  ));
  
  // Convertir a hora local del navegador
  const localHours = utcDate.getHours();
  const localMinutes = utcDate.getMinutes();
  
  return `${String(localHours).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}`;
}

/**
 * Convierte hora local "HH:mm" de vuelta a UTC para enviar al backend
 * @param slotLocal - Slot en formato "HH:mm" local (ej: "06:00" hora local)
 * @param date - Fecha base para el slot
 * @returns Hora UTC en formato "HH:mm" (ej: "09:00" UTC)
 */
function convertSlotLocalToUTC(slotLocal: string, date: Date): string {
  const [hours, minutes] = slotLocal.split(':').map(Number);
  
  // Crear fecha local
  const localDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0
  );
  
  // Extraer componentes UTC
  const utcHours = localDate.getUTCHours();
  const utcMinutes = localDate.getUTCMinutes();
  
  return `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;
}

export default function BookingCalendarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Zustand store con selectores granulares
  const cart = useBookingStore(selectCart);
  const totalPrice = useBookingStore(selectTotalPrice);
  const totalDuration = useBookingStore(selectTotalDuration);
  const clearCart = useBookingStore(selectClearCart);
  
  const authState = useAuthStore(selectAuthState);
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null); // null hasta encontrar primer mes disponible
  const [isInitialized, setIsInitialized] = useState(false);
  const [minBookingAdvanceMinutes, setMinBookingAdvanceMinutes] = useState(15); // Default fallback

  const totalServices = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Leer date y time de query params si vienen del returnUrl
  const dateParam = searchParams.get('date');
  const timeParam = searchParams.get('time');

  // Fetch booking rules (tiempo mínimo de anticipación) al montar
  useEffect(() => {
    const fetchBookingRules = async () => {
      try {
        const rules = await getBookingRules();
        setMinBookingAdvanceMinutes(rules.minBookingAdvanceMinutes);
      } catch (error) {
        console.error('[BookingCalendar] Error fetching booking rules:', error);
        // Mantener default 15 minutos si falla
      }
    };

    fetchBookingRules();
  }, []);

  // Protección: redirigir si carrito vacío (pero solo después de inicializar)
  useEffect(() => {
    // Esperar un momento para que Zustand hidrate desde localStorage
    const timer = setTimeout(() => {
      setIsInitialized(true);
      if (cart.length === 0) {
        navigate('/book');
      }
    }, 100); // 100ms es suficiente para la hidratación

    return () => clearTimeout(timer);
  }, []); // Solo ejecutar una vez al montar

  // Segundo efecto: verificar carrito después de inicialización
  useEffect(() => {
    if (isInitialized && cart.length === 0) {
      navigate('/book');
    }
  }, [cart, isInitialized, navigate]);

  // Restaurar fecha y hora desde query params (returnUrl)
  // timeParam viene en UTC desde handleContinue, necesitamos convertir a local para display
  useEffect(() => {
    if (dateParam && timeParam) {
      try {
        const date = parse(dateParam, 'yyyy-MM-dd', new Date());
        setSelectedDate(date);
        
        // Convertir timeParam (UTC) → local timezone para display
        const timeLocal = convertSlotUTCToLocal(timeParam, date);
        setSelectedTime(timeLocal);
        
        setCurrentMonth(date); // Navegar al mes correcto
      } catch (error) {
        console.error('[BookingCalendar] Error parsing date from returnUrl:', error);
      }
    }
  }, [dateParam, timeParam]);

  // Buscar primer mes con disponibilidad al cargar (solo si no hay returnUrl)
  useEffect(() => {
    if (currentMonth !== null || dateParam) return; // Ya inicializado o viene de returnUrl

    const findFirstAvailableMonth = async () => {
      setLoadingMonth(true);
      try {
        let searchMonth = startOfToday();
        let attempts = 0;
        const maxAttempts = 12; // Buscar hasta 12 meses adelante
        const now = new Date();

        while (attempts < maxAttempts) {
          const monthStr = format(searchMonth, 'yyyy-MM');
          const response = await fetch(
            `${API_BASE_URL}/availability/month?month=${monthStr}&totalDuration=${totalDuration}`
          );

          if (response.ok) {
            const days = await response.json() as string[];
            
            // Filtrar días que realmente tienen slots disponibles
            // Si es hoy, verificar que tenga slots después del tiempo mínimo
            const validDays = days.filter(dayStr => {
              const dayDate = parse(dayStr, 'yyyy-MM-dd', new Date());
              const isToday = format(dayDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
              
              // Si no es hoy, asumimos que tiene slots disponibles
              if (!isToday) return true;
              
              // Si es hoy, necesitamos verificar que tenga slots futuros
              // Por ahora, excluimos hoy si todos los slots ya pasaron
              // (esto se validará cuando se carguen los slots reales)
              return false; // Excluir hoy del primer mes, buscar mañana en adelante
            });
            
            if (validDays.length > 0) {
              // Encontrado primer mes con disponibilidad válida
              setCurrentMonth(searchMonth);
              return;
            }
          }

          // Buscar siguiente mes
          searchMonth = addMonths(searchMonth, 1);
          attempts++;
        }

        // No se encontró disponibilidad en 12 meses, iniciar en mes actual
        setCurrentMonth(startOfToday());
      } catch (error) {
        console.error('[BookingCalendar] Error finding first available month:', error);
        setCurrentMonth(startOfToday());
      } finally {
        setLoadingMonth(false);
      }
    };

    findFirstAvailableMonth();
  }, [totalDuration, dateParam, minBookingAdvanceMinutes]); // Agregar minBookingAdvanceMinutes

  // Fetch disponibilidad mensual + auto-select primera fecha
  useEffect(() => {
    if (!currentMonth) return; // Esperar a que currentMonth se inicialice

    const fetchMonthAvailability = async () => {
      setLoadingMonth(true);
      try {
        const month = format(currentMonth, 'yyyy-MM');
        
        const response = await fetch(
          `${API_BASE_URL}/availability/month?month=${month}&totalDuration=${totalDuration}`
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[BookingCalendar] Error response:', errorText);
          throw new Error(`Error fetching month availability: ${response.status}`);
        }

        const days = await response.json() as string[];
        
        // Filtrar días que realmente tienen slots disponibles
        // Si es hoy, excluir porque probablemente no tenga slots futuros
        const now = new Date();
        const validDays = days.filter(dayStr => {
          const dayDate = parse(dayStr, 'yyyy-MM-dd', new Date());
          const isToday = format(dayDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
          // Excluir hoy del mes disponible (los slots de hoy se validarán dinámicamente)
          return !isToday;
        });
        
        setAvailableDays(validDays);

        // Auto-seleccionar primer día disponible
        if (validDays.length > 0 && !selectedDate) {
          const firstDay = parse(validDays[0], 'yyyy-MM-dd', new Date());
          setSelectedDate(firstDay);
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
        
        // CRÍTICO: Usar duración TOTAL del carrito (todos los servicios combinados)
        const response = await fetch(
          `${API_BASE_URL}/availability?durationMinutes=${totalDuration}&date=${dateStr}`
        );
        
        if (!response.ok) {
          throw new Error('Error fetching slots');
        }

        const slotsUTC = await response.json() as string[];
        
        // PASO 1: Convertir slots UTC → Local timezone para display
        const slotsLocal = slotsUTC.map(slotUTC => convertSlotUTCToLocal(slotUTC, selectedDate));
        
        // PASO 2: FILTRO CRÍTICO - Si es hoy, eliminar horarios que ya pasaron (comparar en LOCAL)
        const now = new Date();
        const isToday = format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
        
        const filteredSlots = isToday 
          ? slotsLocal.filter(timeSlot => {
              // Parsear hora del slot en LOCAL timezone
              const [hours, minutes] = timeSlot.split(':').map(Number);
              const slotTime = new Date(selectedDate);
              slotTime.setHours(hours, minutes, 0, 0);
              
              // Usar tiempo mínimo de anticipación dinámico (configurable por admin)
              const minimumTime = new Date(now.getTime() + minBookingAdvanceMinutes * 60 * 1000);
              
              return slotTime >= minimumTime;
            })
          : slotsLocal;
        
        setAvailableSlots(filteredSlots);
      } catch (error) {
        console.error('Error fetching slots:', error);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDate, cart, minBookingAdvanceMinutes]);

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
    
    // CRÍTICO: Convertir selectedTime (local) de vuelta a UTC para el backend
    const timeUTC = convertSlotLocalToUTC(selectedTime, selectedDate);

    if (!isClientAuthenticated) {
      // Redirigir a login con returnUrl (guardar hora UTC en URL)
      const returnUrl = `/book/calendar?date=${dateStr}&time=${timeUTC}`;
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // Usuario autenticado → confirmar reserva (enviar hora UTC)
    navigate(`/book/confirm?date=${dateStr}&time=${timeUTC}`);
  };

  // Handler cambio de mes
  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
    setSelectedDate(undefined); // Reset selección al cambiar mes
  };

  // Verificar si se puede navegar al mes anterior
  const canNavigateToPrevMonth = (): boolean => {
    if (!currentMonth) return false;
    const prevMonth = subMonths(currentMonth, 1);
    const today = startOfToday();
    
    // No permitir meses anteriores al actual
    return !isBefore(prevMonth, today);
  };

  // Verificar si se puede navegar al mes siguiente
  const canNavigateToNextMonth = (): boolean => {
    if (!currentMonth) return false;
    // Permitir navegar hasta 6 meses adelante (configurable)
    const maxMonth = addMonths(startOfToday(), 6);
    const nextMonth = addMonths(currentMonth, 1);
    
    return !isBefore(maxMonth, nextMonth);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/book')}
            className="mb-3 sm:mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Servicios
          </Button>
          
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Selecciona Fecha y Horario</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Elige el día y la hora que mejor te convenga
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
          {/* Columna izquierda: Calendario + Slots */}
          <div className="space-y-4 sm:space-y-6">
            {/* Calendario */}
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <CalendarIcon className="h-5 w-5" />
                      Calendario de Disponibilidad
                    </CardTitle>
                  </div>
                  
                  {/* Navegación de meses compacta (mobile y desktop) */}
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => currentMonth && handleMonthChange(subMonths(currentMonth, 1))}
                      disabled={loadingMonth || !canNavigateToPrevMonth()}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="min-w-[140px] text-center">
                      <span className="text-sm sm:text-base font-medium capitalize">
                        {currentMonth ? format(currentMonth, 'MMMM yyyy', { locale: es }) : 'Cargando...'}
                      </span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => currentMonth && handleMonthChange(addMonths(currentMonth, 1))}
                      disabled={loadingMonth || !canNavigateToNextMonth()}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <CardDescription className="text-xs sm:text-sm">
                    {loadingMonth 
                      ? 'Cargando disponibilidad...' 
                      : availableDays.length > 0
                        ? `${availableDays.length} días disponibles este mes`
                        : 'No hay días disponibles este mes'
                    }
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex justify-center px-2 sm:px-6">
                {loadingMonth ? (
                  <div className="flex items-center justify-center h-[320px] sm:h-[350px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    month={currentMonth || undefined}
                    onSelect={handleDateSelect}
                    onMonthChange={handleMonthChange}
                    disabled={(date) => {
                      // Deshabilitar días pasados
                      if (isBefore(date, startOfToday())) return true;
                      // Deshabilitar días sin disponibilidad
                      return !isDateAvailable(date);
                    }}
                    locale={es}
                    className="rounded-md border w-full"
                  />
                )}
              </CardContent>
            </Card>

            {/* Horarios disponibles */}
            {selectedDate && (
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Clock className="h-5 w-5" />
                    Horarios Disponibles
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm capitalize">
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {loadingSlots ? (
                    <div className="flex items-center justify-center h-[160px] sm:h-[200px]">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[160px] sm:h-[200px] text-center px-4">
                      <Clock className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                      <p className="text-sm sm:text-base text-muted-foreground">
                        No hay horarios disponibles
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Intenta con otra fecha
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                      {availableSlots.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? 'default' : 'outline'}
                          onClick={() => handleSelectSlot(time)}
                          className="h-10 sm:h-12 text-sm sm:text-base font-medium"
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
          <Card className="lg:sticky lg:top-6 h-fit">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Resumen de Reserva</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Revisa los detalles de tu cita
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {/* Fecha y hora seleccionada */}
              {selectedDate && (
                <div className="p-3 sm:p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    <span className="text-xs sm:text-sm font-medium">Fecha</span>
                  </div>
                  <p className="text-xs sm:text-sm capitalize">
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                  </p>
                  
                  {selectedTime && (
                    <>
                      <div className="flex items-center gap-2 mt-3 mb-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-xs sm:text-sm font-medium">Hora</span>
                      </div>
                      <p className="text-base sm:text-lg font-semibold">{selectedTime}</p>
                    </>
                  )}
                </div>
              )}

              {/* Lista de servicios */}
              <div className="space-y-2">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Servicios ({totalServices})
                </h3>
                <div className="space-y-1.5 sm:space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.service.id}
                      className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg bg-muted/50"
                    >
                      <div className="text-xs sm:text-sm flex-1 min-w-0 pr-2">
                        <p className="font-medium truncate">{item.service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          x{item.quantity}
                        </p>
                      </div>
                      <div className="text-right text-xs sm:text-sm shrink-0">
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
              </div>

              {/* Totales */}
              <div className="pt-3 sm:pt-4 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs sm:text-sm font-medium">Duración total</span>
                  </div>
                  <span className="text-sm sm:text-base font-semibold">{totalDuration} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs sm:text-sm font-medium">Total</span>
                  </div>
                  <span className="text-base sm:text-lg font-semibold">${totalPrice}</span>
                </div>
              </div>

              {/* Botones */}
              <div className="space-y-2 pt-3 sm:pt-4">
                <Button
                  onClick={handleContinue}
                  disabled={!selectedTime}
                  className="w-full h-10 sm:h-11 text-sm sm:text-base"
                >
                  {authState.isAuthenticated && authState.type === 'client' 
                    ? 'Confirmar Reserva'
                    : 'Continuar (Iniciar Sesión)'
                  }
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-9 sm:h-10 text-sm sm:text-base"
                  onClick={clearCart}
                >
                  Limpiar Carrito
                </Button>

                {!authState.isAuthenticated && selectedTime && (
                  <p className="text-xs text-center text-muted-foreground pt-1">
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