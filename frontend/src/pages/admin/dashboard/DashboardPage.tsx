import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, selectUser } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, Calendar, DollarSign, Clock, ArrowRight } from "lucide-react";
import { getBookingMetrics, getAllBookings } from '@/api/modules/bookings';
import type { BookingMetrics, Booking } from '@/api/modules/bookings';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import OnboardingBanner from '@/components/admin/OnboardingBanner';

export default function DashboardPage() {
  const user = useAuthStore(selectUser);
  const [metrics, setMetrics] = useState<BookingMetrics | null>(null);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBookingMetrics()
      .then(res => { if (!cancelled) setMetrics(res.metrics); })
      .catch(() => { if (!cancelled) setError('Error al cargar métricas'); });
    getAllBookings({ from: new Date().toISOString(), limit: 1 })
      .then(res => { if (!cancelled && res.bookings.length > 0) setNextBooking(res.bookings[0]); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

  const todayDiff = metrics ? metrics.todayBookings - metrics.yesterdayBookings : null;

  const revenueDiff = metrics && metrics.lastMonthRevenue > 0
    ? ((metrics.monthRevenue - metrics.lastMonthRevenue) / metrics.lastMonthRevenue) * 100
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">¡Bienvenido de vuelta!</h1>
        {user && <p className="text-muted-foreground">{user.email}</p>}
      </div>

      <OnboardingBanner />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas de Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : metrics ? (
              <>
                <div className="text-2xl font-bold">{metrics.todayBookings}</div>
                <p className="text-xs text-muted-foreground">
                  {todayDiff !== null
                    ? (todayDiff >= 0 ? '+' : '') + todayDiff + ' que ayer'
                    : 'Cargando...'}
                </p>
                {metrics.upcomingBookings > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Próximos 7 días: {metrics.upcomingBookings}
                  </p>
                )}
              </>
            ) : (
              <Skeleton className="h-9 w-20" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : metrics ? (
              <>
                <div className="text-2xl font-bold">{formatCurrency(metrics.monthRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {revenueDiff !== null
                    ? (revenueDiff >= 0 ? '+' : '') + revenueDiff.toFixed(1) + '% vs mes anterior'
                    : 'Sin datos mes anterior'}
                </p>
              </>
            ) : (
              <Skeleton className="h-9 w-24" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Servicios Activos</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : metrics ? (
              <>
                <div className="text-2xl font-bold">{metrics.activeServices}</div>
                <p className="text-xs text-muted-foreground">Total de servicios ofrecidos</p>
                {metrics.cancellationRate > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Cancelación: {metrics.cancellationRate.toFixed(1)}%
                  </p>
                )}
              </>
            ) : (
              <Skeleton className="h-9 w-16" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuevos Clientes</CardTitle>
            <Users className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : metrics ? (
              <>
                <div className="text-2xl font-bold">+{metrics.newClientsThisMonth}</div>
                <p className="text-xs text-muted-foreground">Este mes</p>
              </>
            ) : (
              <Skeleton className="h-9 w-16" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Próxima reserva</CardTitle>
        </CardHeader>
        <CardContent>
          {nextBooking ? (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium truncate">{nextBooking.client.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {nextBooking.service.name} · {format(new Date(nextBooking.bookingTime), "d 'de' MMMM, HH:mm", { locale: es })}
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
                <Link to="/admin/bookings">
                  Ver
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin reservas próximas</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
