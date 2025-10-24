import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useClientAuth } from "@/context/AuthContext";
import { useBookingStore, selectCart } from "@/stores/bookingStore";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Sparkles, ArrowRight, MapPin, Phone, Mail, Star, Scissors } from "lucide-react";
import ServicesTable from "@/components/shared/ServicesTable";
import CartSidebar from "@/components/CartSidebar";
import type { Service } from "@/types/service";
import { API_BASE_URL } from "@/api/config";

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { checkExistingSession } = useClientAuth();
  const cart = useBookingStore(selectCart);
  const hasProcessedCallback = useRef(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const hasItems = cart.length > 0;

  // Fetch servicios para preview
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        const response = await fetch(`${baseUrl}/services`);
        if (response.ok) {
          const data = await response.json();
          setServices(data.filter((s: Service) => s.isActive).slice(0, 5)); // Solo 5 servicios
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

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
    <div className={`min-h-screen bg-background ${hasItems ? 'pb-64' : 'pb-32'} lg:pb-0`}>
      {/* Hero Section - AppointMePro Branding */}
      <section className="relative w-full px-4 py-8 sm:px-6 md:py-12 lg:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Badge */}
          <div className="mb-6 flex justify-center sm:justify-start">
            <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Plataforma Profesional
            </span>
          </div>

          {/* Título Principal - AppointMePro */}
          <h1 className="mb-4 text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
            AppointMePro
          </h1>

          {/* Subtítulo */}
          <h2 className="mb-4 text-2xl font-semibold text-foreground/90 sm:text-3xl md:text-4xl">
            La plataforma para profesionales independientes
          </h2>

          {/* Descripción del Servicio */}
          <p className="mb-8 max-w-3xl text-base text-foreground/70 sm:text-lg md:text-xl">
            AppointMePro conecta a profesionales independientes con sus clientes de forma simple y eficiente. 
            Gestiona tu agenda, muestra tus servicios y permite que tus clientes reserven en segundos, sin llamadas ni complicaciones.
          </p>
        </div>
      </section>

      {/* Sección de Ejemplo: Profesional Ficticio */}
      <section className="w-full border-t border-border bg-background px-4 py-12 sm:px-6 md:py-16 lg:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Badge de Ejemplo */}
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground/70 sm:text-sm">
              ✨ Demo Interactiva - Prueba cómo funciona
            </span>
          </div>

          {/* Texto Explicativo */}
          <p className="mb-8 text-center text-sm text-foreground/70 sm:text-base md:mx-auto md:max-w-3xl">
            Este es un ejemplo real de cómo se vería <span className="font-semibold text-foreground">tu negocio</span> en AppointMePro.
            Puedes <span className="font-semibold text-foreground">reservar un servicio</span> y experimentar exactamente lo que tus clientes vivirán.
            La plataforma se personaliza completamente: nombre, servicios, horarios y diseño.
          </p>

          {/* Card del Profesional */}
          <div className="rounded-3xl border border-border bg-background p-6 shadow-sm sm:p-8 md:p-10">
            {/* Header: Avatar + Info Principal */}
            <div className="mb-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-20 w-20 overflow-hidden rounded-full bg-foreground/10 sm:h-24 sm:w-24 md:h-28 md:w-28">
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
                    CM
                  </div>
                </div>
                {/* Badge de Disponibilidad */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white">
                  Disponible Hoy
                </div>
              </div>

              {/* Info del Negocio */}
              <div className="flex-1 text-center sm:text-left">
                <h3 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
                  Studio Carlos Méndez
                </h3>
                <p className="mb-3 text-base text-foreground/80 sm:text-lg md:text-xl">
                  Barbería Profesional
                </p>
                <p className="mb-4 max-w-2xl text-sm text-foreground/70 sm:text-base">
                  Más de 10 años de experiencia brindando servicios de barbería premium. 
                  Especializado en cortes modernos, afeitado clásico y cuidado de barba.
                </p>
                {/* Rating */}
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400 sm:h-5 sm:w-5" />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-foreground/70 sm:text-base">
                    5.0 (248 reseñas)
                  </span>
                </div>
              </div>
            </div>

            {/* Sección de Servicios y Carrito - Layout 2 columnas */}
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-foreground/5 p-2">
                  <Scissors className="h-5 w-5 text-foreground sm:h-6 sm:w-6" />
                </div>
                <h4 className="text-lg font-semibold text-foreground sm:text-xl">Nuestros Servicios</h4>
              </div>
              
              {loadingServices ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground/20 border-t-foreground" />
                </div>
              ) : services.length > 0 ? (
                <>
                  <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
                    {/* Columna 1: Lista de servicios */}
                    <div className="rounded-2xl border border-border bg-background p-4 sm:p-6 lg:h-[450px] lg:flex lg:flex-col">
                      <div className="lg:flex-1 lg:overflow-y-auto">
                        <ServicesTable 
                          services={services} 
                          showCategory={true}
                          compact={true}
                        />
                      </div>
                      <div className="mt-4 text-center lg:flex-shrink-0">
                        <Link to="/book" className="text-sm font-medium text-foreground hover:underline">
                          Ver todos los servicios →
                        </Link>
                      </div>
                    </div>

                    {/* Columna 2: Carrito de reservas - Solo visible en desktop */}
                    <div className="hidden lg:block rounded-2xl border border-border bg-background lg:h-[450px]">
                      <CartSidebar />
                    </div>
                  </div>

                  {/* Carrito Fixed Bottom - Solo móvil */}
                  <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background shadow-2xl">
                    <CartSidebar />
                  </div>
                </>
              ) : null}
            </div>

            {/* Grid de Información */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Card: Horarios */}
              <div className="rounded-2xl border border-border bg-background p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-foreground/5 p-2">
                    <Clock className="h-5 w-5 text-foreground sm:h-6 sm:w-6" />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground sm:text-xl">Horarios</h4>
                </div>
                <div className="space-y-2 text-sm text-foreground/70 sm:text-base">
                  <div className="flex justify-between">
                    <span>Lunes - Viernes</span>
                    <span className="font-medium text-foreground">9:00 - 19:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sábado</span>
                    <span className="font-medium text-foreground">10:00 - 17:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Domingo</span>
                    <span className="font-medium text-foreground">Cerrado</span>
                  </div>
                </div>
              </div>

              {/* Card: Contacto */}
              <div className="rounded-2xl border border-border bg-background p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-foreground/5 p-2">
                    <Phone className="h-5 w-5 text-foreground sm:h-6 sm:w-6" />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground sm:text-xl">Contacto</h4>
                </div>
                <div className="space-y-3 text-sm text-foreground/70 sm:text-base">
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                    <span>+34 612 345 678</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                    <span className="break-all">carlos@studiomendez.com</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                    <span>Calle Gran Vía 45, Madrid, 28013</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA del Ejemplo */}
            <div className="mt-8 flex justify-center">
              <Link to="/book" className="w-full sm:w-auto">
                <Button 
                  size="lg"
                  className="group h-12 w-full rounded-full bg-foreground px-8 text-base font-semibold text-background transition-all hover:bg-foreground/90 sm:h-14 sm:w-auto sm:text-lg"
                >
                  Reservar Ahora
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full border-t border-border bg-background px-4 py-12 sm:px-6 md:py-16 lg:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            ¿Por qué AppointMePro?
          </h2>
          <div className="grid gap-8 sm:gap-10 md:grid-cols-3 md:gap-12">
            {/* Feature 1 */}
            <div className="flex flex-col items-start space-y-3">
              <div className="rounded-2xl bg-foreground/5 p-3">
                <Calendar className="h-6 w-6 text-foreground sm:h-7 sm:w-7" />
              </div>
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                Disponibilidad real
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                Consulta horarios actualizados en tiempo real. Olvídate de las llamadas para confirmar disponibilidad.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-start space-y-3">
              <div className="rounded-2xl bg-foreground/5 p-3">
                <Clock className="h-6 w-6 text-foreground sm:h-7 sm:w-7" />
              </div>
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                Reserva en minutos
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                Elige tu servicio, selecciona el horario que más te convenga y confirma. Así de simple.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-start space-y-3">
              <div className="rounded-2xl bg-foreground/5 p-3">
                <Sparkles className="h-6 w-6 text-foreground sm:h-7 sm:w-7" />
              </div>
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                Experiencia premium
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                Interfaz intuitiva y moderna diseñada para que reserves con confianza desde cualquier dispositivo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final Section */}
      <section className="relative w-full border-t border-border bg-foreground py-16 text-center md:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-background sm:text-4xl md:text-5xl">
            ¿Listo para comenzar?
          </h2>
          <p className="mb-8 text-base text-background/80 sm:text-lg md:text-xl">
            Descubre todo lo que AppointMePro puede hacer por tu negocio.
          </p>
          <Link to="/features">
            <Button 
              size="lg" 
              variant="secondary"
              className="group h-12 rounded-full bg-background px-8 text-base font-semibold text-foreground transition-all hover:bg-background/90 sm:h-14 sm:text-lg"
            >
              Ver Características
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}