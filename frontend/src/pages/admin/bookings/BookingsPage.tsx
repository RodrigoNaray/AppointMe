"use client"

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";
import { DataTable } from "@/components/shared/DataTable";
import { getColumns, BookingActions, Booking } from "./columns";
import bookingService, { Booking as ApiBooking } from "@/api/modules/bookings";
import { Loader2, Search, Filter, CalendarOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageSkeleton } from '@/components/admin/PageSkeleton';
import { EmptyState } from '@/components/admin/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cancelBookingByAdmin, rescheduleBookingByAdmin } from "@/api/modules/bookings";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 0,
    total_count: 0,
    per_page: 20,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(null);
  const [newDateTime, setNewDateTime] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  useEffect(() => {
    fetchBookings(currentPage);
  }, [currentPage]);

  const fetchBookings = async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await bookingService.getAllBookings({ 
        page, 
        limit: 20 
      });
      
      if (response.success) {
        const mappedBookings: Booking[] = response.bookings.map((booking: ApiBooking) => ({
          id: booking.id,
          clientName: booking.client.name,
          serviceName: booking.service.name,
          bookingTime: format(new Date(booking.bookingTime), "dd/MM/yyyy HH:mm", { locale: es }),
          status: mapBackendStatus(booking.status),
        }));
        
        setBookings(mappedBookings);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('[BookingsPage] Error fetching bookings:', error);
      toast.error('Error al cargar las reservas');
    } finally {
      setIsLoading(false);
    }
  };

  const mapBackendStatus = (status: string): "Confirmada" | "Completada" | "Cancelada" => {
    switch (status) {
      case 'CONFIRMED':
      case 'PENDING':
        return 'Confirmada';
      case 'COMPLETED':
        return 'Completada';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return 'Confirmada';
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelBookingId) return;
    try {
      setIsCancelling(true);
      const reason = cancelReason.trim() || undefined;
      await cancelBookingByAdmin(cancelBookingId, reason);
      toast.success('Reserva cancelada exitosamente');
      setCancelBookingId(null);
      setCancelReason("");
      fetchBookings(currentPage);
    } catch (error) {
      toast.error('Error al cancelar la reserva');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRescheduleBooking = async () => {
    if (!rescheduleBookingId || !newDateTime) return;
    try {
      setIsRescheduling(true);
      const isoTime = new Date(newDateTime).toISOString();
      await rescheduleBookingByAdmin(rescheduleBookingId, isoTime);
      toast.success('Reserva reprogramada exitosamente');
      setRescheduleBookingId(null);
      setNewDateTime("");
      fetchBookings(currentPage);
    } catch (error) {
      toast.error('Error al reprogramar la reserva');
    } finally {
      setIsRescheduling(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = 
      searchTerm === "" ||
      booking.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.serviceName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === "all" || 
      booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pagination.total_pages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchBookings(1);
  };

  const actions = useMemo<BookingActions>(() => ({
    onCancel: (id: string) => setCancelBookingId(id),
    onReschedule: (id: string) => setRescheduleBookingId(id),
  }), []);

  const columns = useMemo(() => getColumns(actions), [actions]);

  if (isLoading && bookings.length === 0) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Reservas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pagination.total_count} {pagination.total_count === 1 ? 'reserva' : 'reservas'} en total
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="Buscar por cliente o servicio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Confirmada">Confirmada</SelectItem>
                  <SelectItem value="Completada">Completada</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchTerm || statusFilter !== "all") && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Filtros activos:</span>
                {searchTerm && (
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                    Búsqueda: "{searchTerm}"
                  </span>
                )}
                {statusFilter !== "all" && (
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                    Estado: {statusFilter}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  className="text-xs"
                >
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/60" />
        </div>
      ) : filteredBookings.length === 0 ? (
        searchTerm || statusFilter !== "all" ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No se encontraron reservas con los filtros aplicados
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={CalendarOff}
            title="No hay reservas"
            description="Las reservas aparecerán acá cuando los clientes agenden."
          />
        )
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <DataTable columns={columns} data={filteredBookings} />
          </div>

          {pagination.total_pages > 1 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    Página {pagination.current_page} de {pagination.total_pages}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1 || isLoading}
                    >
                      Anterior
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                        let pageNum: number;
                        
                        if (pagination.total_pages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= pagination.total_pages - 2) {
                          pageNum = pagination.total_pages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            disabled={isLoading}
                            className="w-10 h-10 p-0 hidden sm:inline-flex"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === pagination.total_pages || isLoading}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <AlertDialog open={cancelBookingId !== null} onOpenChange={(open) => !open && setCancelBookingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reserva</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El cliente recibirá un email de notificación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Motivo de la cancelación..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              maxLength={500}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setCancelBookingId(null); setCancelReason(""); }}>
              Volver
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelBooking} disabled={isCancelling}>
              {isCancelling ? "Cancelando..." : "Sí, cancelar reserva"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rescheduleBookingId !== null} onOpenChange={(open) => !open && setRescheduleBookingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprogramar reserva</DialogTitle>
            <DialogDescription>
              Selecciona la nueva fecha y hora. El cliente recibirá un email con el cambio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reschedule-datetime">Nueva fecha y hora</Label>
            <Input
              id="reschedule-datetime"
              type="datetime-local"
              value={newDateTime}
              onChange={(e) => setNewDateTime(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRescheduleBookingId(null); setNewDateTime(""); }}>
              Cancelar
            </Button>
            <Button onClick={handleRescheduleBooking} disabled={isRescheduling || !newDateTime}>
              {isRescheduling ? "Reprogramando..." : "Reprogramar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
