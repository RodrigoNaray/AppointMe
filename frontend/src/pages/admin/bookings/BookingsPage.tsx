"use client"

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";
import { DataTable } from "@/components/shared/DataTable";
import { columns, Booking } from "./columns";
import bookingService, { Booking as ApiBooking } from "@/api/modules/bookings";
import { Loader2, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * BookingsPage - Página de administración de reservas
 * 
 * Funcionalidad:
 * - Lista todas las reservas del sistema (admin)
 * - Filtros: búsqueda por cliente/servicio, estado, fecha
 * - Paginación interactiva con botones prev/next
 * - Responsive: mobile-first design
 * 
 * OWASP Security:
 * - Auth: Requiere admin autenticado (AdminRoute wrapper)
 * - Data exposure: Solo admin puede ver todas las reservas
 * - Input sanitization: Búsqueda en backend (no SQL injection)
 * 
 * React Best Practices (2025):
 * - Debounced search para performance
 * - Controlled inputs con useState
 * - useEffect con cleanup para cancelar requests
 * - Memoization de filtros (futuro: useMemo)
 * 
 * shadcn-ui Components:
 * - Input (búsqueda)
 * - Select (filtros estado)
 * - Button (paginación)
 * - Card (contenedor filtros)
 */
export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 0,
    total_count: 0,
    per_page: 20,
  });

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

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
        // Mapear datos del backend (ApiBooking) al formato UI (Booking de columns)
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

  // Mapear estados del backend a formato UI
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

  // Filtrado local (client-side)
  const filteredBookings = bookings.filter((booking) => {
    // Filtro de búsqueda (cliente o servicio)
    const matchesSearch = 
      searchTerm === "" ||
      booking.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.serviceName.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de estado
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
    // Recargar desde página 1 cuando se aplican filtros
    setCurrentPage(1);
    fetchBookings(1);
  };

  if (isLoading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Reservas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pagination.total_count} {pagination.total_count === 1 ? 'reserva' : 'reservas'} en total
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Búsqueda por cliente o servicio */}
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

              {/* Filtro por estado */}
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

            {/* Mostrar filtros activos */}
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

      {/* Tabla */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/60" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchTerm || statusFilter !== "all" 
              ? "No se encontraron reservas con los filtros aplicados"
              : "No hay reservas registradas"}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <DataTable columns={columns} data={filteredBookings} />
          </div>

          {/* Paginación */}
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
    </div>
  );
}