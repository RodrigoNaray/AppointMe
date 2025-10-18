import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useClientAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarCheck, List, MousePointerClick } from "lucide-react";

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { checkExistingSession } = useClientAuth();
  const hasProcessedCallback = useRef(false);

  useEffect(() => {
    // Evitar procesamiento múltiple del callback
    if (hasProcessedCallback.current) return;

    // Verificar si venimos del callback de Google OAuth
    const loginStatus = searchParams.get('login');
    const errorParam = searchParams.get('error');

    if (loginStatus === 'success') {
      hasProcessedCallback.current = true;
      
      // Verificar la sesión después del login con Google
      checkExistingSession();
      toast.success('¡Bienvenido! Has iniciado sesión con Google');
      
      // Limpiar los parámetros de la URL
      setSearchParams({});
    } else if (errorParam) {
      hasProcessedCallback.current = true;
      
      // Manejar errores de autenticación
      let errorMessage = 'Error al iniciar sesión con Google';
      
      if (errorParam === 'google_auth_failed') {
        errorMessage = 'No se pudo autenticar con Google. Intenta nuevamente.';
      } else if (errorParam === 'authentication_failed') {
        errorMessage = 'Error en la autenticación. Por favor intenta de nuevo.';
      } else if (errorParam === 'server_error') {
        errorMessage = 'Error del servidor. Por favor intenta más tarde.';
      }
      
      toast.error(errorMessage);
      
      // Limpiar los parámetros de la URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, checkExistingSession]);

  return (
    <div className="flex flex-col items-center">
      <section className="w-full py-12 md:py-24 lg:py-32 text-center">
        <div className="container px-4 md:px-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4">
            Agenda tu Próximo Servicio, Fácil y Rápido
          </h1>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-xl mb-8">
            AppointMe es la solución moderna para que profesionales independientes gestionen su agenda y para que los clientes reserven citas sin complicaciones.
          </p>
          <Link to="/services">
            <Button size="lg">
              Ver Servicios y Reservar
            </Button>
          </Link>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 bg-gray-100 dark:bg-gray-800">
        <div className="container px-4 md:px-6">
          <h2 className="text-3xl font-bold text-center mb-12">¿Por qué usar AppointMe?</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <Card>
              <CardHeader className="items-center text-center">
                <List className="h-10 w-10 mb-4 text-primary" />
                <CardTitle>Catálogo Claro</CardTitle>
                <CardDescription className="pt-2">Explora todos los servicios ofrecidos, con detalles y precios claros.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="items-center text-center">
                <CalendarCheck className="h-10 w-10 mb-4 text-primary" />
                <CardTitle>Disponibilidad Real</CardTitle>
                <CardDescription className="pt-2">Consulta los horarios disponibles en tiempo real y olvídate de las idas y vueltas.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="items-center text-center">
                <MousePointerClick className="h-10 w-10 mb-4 text-primary" />
                <CardTitle>Reserva en 3 Pasos</CardTitle>
                <CardDescription className="pt-2">Elige tu servicio, selecciona tu horario y confirma tu cita. Así de simple.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 text-center">
        <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold mb-4">¿Lista para agendar?</h2>
            <p className="text-muted-foreground mb-8">Tu próxima cita está a solo un par de clics de distancia.</p>
            <Link to="/services">
                <Button size="lg" variant="outline">
                    Comenzar a Reservar
                </Button>
            </Link>
        </div>
      </section>
    </div>
  );
}