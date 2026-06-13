import { useEffect, useState } from 'react';
import { useAuthStore, selectUser } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, DollarSign, Clock } from "lucide-react";
import { getBookingMetrics } from '@/api/modules/bookings';
import type { BookingMetrics } from '@/api/modules/bookings';
import OnboardingBanner from '@/components/admin/OnboardingBanner';

export default function DashboardPage() {
  const user = useAuthStore(selectUser);
  const [metrics, setMetrics] = useState<BookingMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBookingMetrics()
      .then(res => { if (!cancelled) setMetrics(res.metrics); })
      .catch(() => { if (!cancelled) setError('Error al cargar métricas'); });
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
              </>
            ) : (
              <div className="h-9 animate-pulse bg-muted rounded" />
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
              <div className="h-9 animate-pulse bg-muted rounded" />
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
              </>
            ) : (
              <div className="h-9 animate-pulse bg-muted rounded" />
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
              <div className="h-9 animate-pulse bg-muted rounded" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}