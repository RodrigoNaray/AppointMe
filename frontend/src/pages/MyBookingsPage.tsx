import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore, selectAuthState, selectIsLoading } from '@/stores/authStore';
import { getMyBookings, cancelBooking, Booking } from '@/api/modules/bookings';
import { getBookingRules } from '@/api/modules/settings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CalendarX, Loader2, X, Calendar, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { canCancelBooking } from '@/lib/bookingUtils';

/**
 * MyBookingsPage Component
 * 
 * Vista de reservas del cliente autenticado con diseño responsive adaptativo:
 * - React 19: Hooks + composición de componentes
 * - TypeScript: Type-safe con interfaces del API
 * - shadcn-ui: Tabs + Table (desktop) + Cards (mobile) + Pagination
 * - OWASP A01:2021: Autenticación requerida, validación server-side
 * - UX: Paginación client-side, diseño adaptativo sin scroll horizontal
 * - Responsive: Cards en móvil (<768px), tabla en desktop (≥768px)
 * 
 * FASE 4: Funcionalidad de cancelación + Paginación + Responsive design
 */
export default function MyBookingsPage() {
  const authState = useAuthStore(selectAuthState);
  const isCheckingAuth = useAuthStore(selectIsLoading);
  const navigate = useNavigate();
  
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [minCancellationNoticeMinutes, setMinCancellationNoticeMinutes] = useState<number>(120); // Default 2h
  
  // Estado para paginación
  const [currentPageUpcoming, setCurrentPageUpcoming] = useState(1);
  const [currentPagePast, setCurrentPagePast] = useState(1);
  const itemsPerPage = 10;
  
  // Estado para modal de confirmación
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Funciones ANTES del useEffect (para evitar warnings de dependencies)
  const fetchSettings = async () => {
    try {
      const rules = await getBookingRules();
      setMinCancellationNoticeMinutes(rules.minCancellationNoticeMinutes);
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Usar fallback de 120 minutos si falla
    }
  };

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const response = await getMyBookings({ limit: 50 }); // Obtener las últimas 50 reservas
      
      const now = new Date();
      const upcoming: Booking[] = [];
      const past: Booking[] = [];

      // Separar reservas en próximas y pasadas
      response.bookings.forEach(booking => {
        const bookingDate = new Date(booking.bookingTime);
        if (bookingDate >= now) {
          upcoming.push(booking);
        } else {
          past.push(booking);
        }
      });

      // Ordenar: próximas (más cercanas primero), pasadas (más recientes primero)
      upcoming.sort((a, b) => new Date(a.bookingTime).getTime() - new Date(b.bookingTime).getTime());
      past.sort((a, b) => new Date(b.bookingTime).getTime() - new Date(a.bookingTime).getTime());

      setUpcomingBookings(upcoming);
      setPastBookings(past);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Error al cargar las reservas');
    } finally {
      setIsLoading(false);
    }
  };

  // TODOS LOS HOOKS DEBEN ESTAR ANTES DE LOS EARLY RETURNS (Rules of Hooks)
  useEffect(() => {
    // Solo ejecutar si ya terminó de cargar el auth state
    if (!isCheckingAuth && authState.isAuthenticated && authState.type === 'client') {
      fetchBookings();
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingAuth, authState.isAuthenticated, authState.type]);

  const handleCancelClick = (booking: Booking) => {
    setBookingToCancel(booking);
  };

  const handleCancelConfirm = async () => {
    if (!bookingToCancel) return;

    try {
      setIsCancelling(true);
      await cancelBooking(bookingToCancel.id);
      
      toast.success('Reserva cancelada exitosamente');
      
      // Actualizar lista local
      setUpcomingBookings(prev => prev.filter(b => b.id !== bookingToCancel.id));
      setBookingToCancel(null);
      
      // Refrescar datos del servidor
      await fetchBookings();
    } catch (error: unknown) {
      console.error('Error cancelling booking:', error);
      const errorMessage = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(errorMessage || 'Error al cancelar la reserva');
    } finally {
      setIsCancelling(false);
    }
  };

  /**
   * Calcula paginación
   * Justificación: Client-side pagination para mejor UX (sin latencia de red)
   */
  const getPaginatedBookings = (bookings: Booking[], currentPage: number) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return bookings.slice(startIndex, endIndex);
  };

  const getTotalPages = (total: number) => Math.ceil(total / itemsPerPage);

  /**
   * Tabla de reservas con diseño responsive optimizado
   * 
   * Justificación UX:
   * - Stack layout en mobile: Info principal + detalles debajo
   * - Tabla compacta en desktop: Todas las columnas visibles
   * - Sin scroll horizontal en ningún breakpoint
   * - Badge visual para status (verde confirmada, gris cancelada)
   * - Botón cancelar solo visible si cumple condiciones
   * 
   * Justificación técnica (React Best Practices 2025):
   * - Renderizado condicional basado en props
   * - Componentes reutilizables (BookingRow separado lógicamente)
   * - Type-safe con TypeScript
   */
  const BookingsTable = ({ 
    bookings, 
    showCancelButton,
    currentPage,
    onPageChange
  }: { 
    bookings: Booking[]; 
    showCancelButton: boolean;
    currentPage: number;
    onPageChange: (page: number) => void;
  }) => {
    const paginatedBookings = getPaginatedBookings(bookings, currentPage);
    const totalPages = getTotalPages(bookings.length);

    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%] min-w-[150px]">Servicio</TableHead>
                <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                <TableHead className="hidden md:table-cell">Hora</TableHead>
                <TableHead className="hidden lg:table-cell">Duración</TableHead>
                <TableHead className="hidden xl:table-cell">Precio</TableHead>
                <TableHead>Estado</TableHead>
                {showCancelButton && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showCancelButton ? 7 : 6} className="text-center py-8 text-muted-foreground">
                    No hay reservas para mostrar
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBookings.map((booking) => {
                  const bookingDate = new Date(booking.bookingTime);
                  const cancelCheck = canCancelBooking(booking.bookingTime, minCancellationNoticeMinutes);
                  const showCancel = showCancelButton && booking.status === 'CONFIRMED' && cancelCheck.canCancel;

                  return (
                    <TableRow key={booking.id} data-testid="booking-row" data-booking-id={booking.id}>
                      {/* Columna Servicio - Siempre visible con info apilada en mobile */}
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">{booking.service.name}</span>
                          {/* Mostrar fecha/hora en mobile (ocultos en desktop) */}
                          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground sm:hidden">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(bookingDate, "dd/MM/yyyy", { locale: es })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(bookingDate, "HH:mm")} hs ({booking.durationMinutes} min)
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${booking.service.price.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Columnas desktop - Ocultas en mobile */}
                      <TableCell className="hidden sm:table-cell">
                        {format(bookingDate, "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {format(bookingDate, "HH:mm")} hs
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {booking.durationMinutes} min
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        ${booking.service.price.toFixed(2)}
                      </TableCell>

                      {/* Estado - Siempre visible */}
                      <TableCell>
                        <Badge 
                          variant={booking.status === 'CONFIRMED' ? 'default' : 'secondary'}
                          className="whitespace-nowrap"
                        >
                          {booking.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}
                        </Badge>
                      </TableCell>

                      {/* Acciones - Siempre visible si showCancelButton */}
                      {showCancelButton && (
                        <TableCell className="text-right">
                          {showCancel ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelClick(booking)}
                              className="whitespace-nowrap"
                              data-testid="cancel-booking"
                              data-booking-id={booking.id}
                            >
                              <X className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">Cancelar</span>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground block max-w-[100px] sm:max-w-none">
                              {booking.status === 'CANCELLED' 
                                ? 'Cancelada'
                                : 'Cerrada'
                              }
                            </span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="gap-1 pl-2.5"
                >
                  <span>Anterior</span>
                </Button>
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <Button
                    variant={currentPage === page ? 'outline' : 'ghost'}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    className="min-w-[2.5rem]"
                  >
                    {page}
                  </Button>
                </PaginationItem>
              ))}

              <PaginationItem>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="gap-1 pr-2.5"
                >
                  <span>Siguiente</span>
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    );
  };

  const EmptyState = ({ type }: { type: 'upcoming' | 'past' }) => {
    if (type === 'upcoming') {
      return (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <CalendarX className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No tienes reservas próximas</h3>
              <p className="text-muted-foreground mb-4">
                Reserva un servicio para comenzar
              </p>
            </div>
            <Button onClick={() => navigate('/book')}>
              Reservar Ahora
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="text-center py-12">
        <CardContent className="space-y-4">
          <CalendarX className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Aún no has tenido reservas</h3>
            <p className="text-muted-foreground">
              Tus reservas pasadas aparecerán aquí
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  // GUARDS: Early returns DESPUÉS de todos los hooks (Rules of Hooks)
  // CRÍTICO: Esperar a que termine de cargar el auth state
  if (isCheckingAuth) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
      </div>
    );
  }

  // Redireccionar si no está autenticado (DESPUÉS de verificar isCheckingAuth)
  if (!authState.isAuthenticated || authState.type !== 'client') {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Mis Reservas</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header con navegación */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Mis Reservas</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="flex-1 sm:flex-none"
          >
            Volver al Inicio
          </Button>
          <Button
            onClick={() => navigate('/book')}
            className="flex-1 sm:flex-none"
          >
            Nueva Reserva
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upcoming' | 'past')}>
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="upcoming">
            Próximas ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Pasadas ({pastBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {upcomingBookings.length === 0 ? (
            <EmptyState type="upcoming" />
          ) : (
            <BookingsTable 
              bookings={upcomingBookings} 
              showCancelButton={true}
              currentPage={currentPageUpcoming}
              onPageChange={setCurrentPageUpcoming}
            />
          )}
        </TabsContent>

        <TabsContent value="past">
          {pastBookings.length === 0 ? (
            <EmptyState type="past" />
          ) : (
            <BookingsTable 
              bookings={pastBookings} 
              showCancelButton={false}
              currentPage={currentPagePast}
              onPageChange={setCurrentPagePast}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de confirmación de cancelación */}
      <AlertDialog open={!!bookingToCancel} onOpenChange={() => setBookingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              {bookingToCancel && (
                <>
                  Estás por cancelar la reserva de <strong>{bookingToCancel.service.name}</strong> programada para el{' '}
                  <strong>{format(new Date(bookingToCancel.bookingTime), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}</strong>.
                  <br />
                  <br />
                  Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-cancel"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Sí, cancelar reserva'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
