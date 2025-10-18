import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Shield, BarChart3, Bell, Settings, ArrowRight, CheckCircle2 } from "lucide-react";

export default function PlatformFeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative w-full px-4 py-16 sm:px-6 md:py-24 lg:py-32 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            La plataforma profesional
            <br />
            para tu negocio
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-base text-foreground/70 sm:text-lg md:text-xl">
            AppointMePro te permite gestionar tu agenda, mostrar tus servicios y recibir reservas 
            las 24 horas del día. Todo desde un panel de control intuitivo y seguro.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link to="/contact" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                className="group h-12 w-full rounded-full bg-foreground px-8 text-base font-semibold text-background transition-all hover:bg-foreground/90 sm:h-14 sm:w-auto sm:text-lg"
              >
                Solicitar Demo
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <Link to="/" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                variant="outline"
                className="h-12 w-full rounded-full px-8 text-base font-semibold sm:h-14 sm:w-auto sm:text-lg"
              >
                Ver Ejemplo en Vivo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Características Principales */}
      <section className="w-full border-t border-border bg-background px-4 py-12 sm:px-6 md:py-16 lg:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            Todo lo que necesitas para gestionar tu negocio
          </h2>

          <div className="grid gap-8 sm:gap-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {/* Feature 1 */}
            <div className="flex flex-col items-start space-y-3">
              <div className="rounded-2xl bg-foreground/5 p-3">
                <Calendar className="h-6 w-6 text-foreground sm:h-7 sm:w-7" />
              </div>
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                Gestión de agenda
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                Define tus horarios de atención, bloques de tiempo y días no laborables. 
                La agenda se actualiza en tiempo real.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-start space-y-3">
              <div className="rounded-2xl bg-foreground/5 p-3">
                <Settings className="h-6 w-6 text-foreground sm:h-7 sm:w-7" />
              </div>
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                Múltiples servicios
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                Crea y gestiona todos tus servicios con precios, duraciones y descripciones personalizadas.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-start space-y-3">
              <div className="rounded-2xl bg-foreground/5 p-3">
                <Bell className="h-6 w-6 text-foreground sm:h-7 sm:w-7" />
              </div>
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                Notificaciones automáticas
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                Tus clientes reciben confirmaciones por email al reservar. Sin intervención manual.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="flex flex-col items-start space-y-3">
              <div className="rounded-2xl bg-foreground/5 p-3">
                <BarChart3 className="h-6 w-6 text-foreground sm:h-7 sm:w-7" />
              </div>
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                Panel administrativo
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                Visualiza todas tus reservas, gestiona servicios y controla tu agenda desde un solo lugar.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="flex flex-col items-start space-y-3">
              <div className="rounded-2xl bg-foreground/5 p-3">
                <Shield className="h-6 w-6 text-foreground sm:h-7 sm:w-7" />
              </div>
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                Seguridad garantizada
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                Sistema con autenticación JWT, encriptación de contraseñas y protección de datos.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="flex flex-col items-start space-y-3">
              <div className="rounded-2xl bg-foreground/5 p-3">
                <Clock className="h-6 w-6 text-foreground sm:h-7 sm:w-7" />
              </div>
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                Disponible 24/7
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                Tus clientes pueden reservar en cualquier momento, incluso cuando no estás trabajando.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo Funciona */}
      <section className="w-full border-t border-border bg-background px-4 py-12 sm:px-6 md:py-16 lg:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            Cómo funciona
          </h2>

          <div className="grid gap-10 md:grid-cols-3 md:gap-12">
            {/* Paso 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-2xl font-bold text-background">
                1
              </div>
              <h3 className="mb-3 text-xl font-semibold text-foreground sm:text-2xl">
                Crea tu cuenta
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                Regístrate como administrador y accede a tu panel de control personalizado.
              </p>
            </div>

            {/* Paso 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-2xl font-bold text-background">
                2
              </div>
              <h3 className="mb-3 text-xl font-semibold text-foreground sm:text-2xl">
                Configura tus servicios
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                Define tus servicios, precios, horarios de atención y disponibilidad.
              </p>
            </div>

            {/* Paso 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-2xl font-bold text-background">
                3
              </div>
              <h3 className="mb-3 text-xl font-semibold text-foreground sm:text-2xl">
                Recibe reservas
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                Tus clientes reservan online y tú recibes notificaciones automáticamente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Prueba la Experiencia - Demo Interactiva */}
      <section className="w-full border-t border-border bg-foreground/5 px-4 py-12 sm:px-6 md:py-16 lg:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background sm:text-sm">
              ✨ Prueba sin compromiso
            </span>
          </div>

          <h2 className="mb-6 text-center text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            Experiencia completa desde el día 1
          </h2>

          <p className="mb-12 text-center text-base text-foreground/70 sm:text-lg md:mx-auto md:max-w-3xl">
            No necesitas imaginar cómo funcionará. Regístrate, configura tus servicios y 
            experimenta exactamente lo que verán tus clientes al reservar contigo.
          </p>

          <div className="grid gap-8 md:grid-cols-2 md:gap-10">
            {/* Bloque 1: Como Admin */}
            <div className="rounded-2xl border border-border bg-background p-6 sm:p-8">
              <div className="mb-4 text-4xl">🎯</div>
              <h3 className="mb-3 text-xl font-semibold text-foreground sm:text-2xl">
                Vista de Administrador
              </h3>
              <ul className="space-y-3 text-sm text-foreground/70 sm:text-base">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-foreground">•</span>
                  <span>Crea servicios con nombre, precio y duración</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-foreground">•</span>
                  <span>Define tu horario de atención y días laborables</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-foreground">•</span>
                  <span>Bloquea horarios específicos cuando no estés disponible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-foreground">•</span>
                  <span>Gestiona reservas desde tu panel de control</span>
                </li>
              </ul>
            </div>

            {/* Bloque 2: Como Cliente */}
            <div className="rounded-2xl border border-border bg-background p-6 sm:p-8">
              <div className="mb-4 text-4xl">👤</div>
              <h3 className="mb-3 text-xl font-semibold text-foreground sm:text-2xl">
                Vista de Cliente
              </h3>
              <ul className="space-y-3 text-sm text-foreground/70 sm:text-base">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-foreground">•</span>
                  <span>Navega por tu catálogo de servicios personalizado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-foreground">•</span>
                  <span>Ve solo los horarios que TÚ habilitaste</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-foreground">•</span>
                  <span>Reserva en segundos con confirmación automática por email</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-foreground">•</span>
                  <span>Experiencia profesional con tu marca y estilo</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Personalización */}
          <div className="mt-10 rounded-2xl border-2 border-foreground/20 bg-background p-6 text-center sm:p-8">
            <div className="mb-4 text-5xl">🎨</div>
            <h3 className="mb-3 text-2xl font-bold text-foreground sm:text-3xl">
              100% Personalizable
            </h3>
            <p className="mx-auto max-w-2xl text-base text-foreground/70 sm:text-lg">
              La página que viste antes es solo un <span className="font-semibold text-foreground">ejemplo</span>. 
              Tu negocio tendrá su propio nombre, servicios, horarios, información de contacto y diseño. 
              Cada profesional tiene su propia identidad en AppointMePro.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-10 flex justify-center">
            <Link to="/" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                className="group h-12 w-full rounded-full bg-foreground px-8 text-base font-semibold text-background transition-all hover:bg-foreground/90 sm:h-14 sm:w-auto sm:text-lg"
              >
                Ver Demo en Vivo
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="w-full border-t border-border bg-background px-4 py-12 sm:px-6 md:py-16 lg:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            ¿Por qué elegir AppointMePro?
          </h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-green-500" />
              <div>
                <h3 className="mb-1 text-lg font-semibold text-foreground">
                  Sin complicaciones técnicas
                </h3>
                <p className="text-sm text-foreground/70 sm:text-base">
                  No necesitas conocimientos técnicos. Interfaz intuitiva diseñada para profesionales.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-green-500" />
              <div>
                <h3 className="mb-1 text-lg font-semibold text-foreground">
                  Ahorra tiempo
                </h3>
                <p className="text-sm text-foreground/70 sm:text-base">
                  Olvídate de confirmar reservas por teléfono o WhatsApp. Todo automatizado.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-green-500" />
              <div>
                <h3 className="mb-1 text-lg font-semibold text-foreground">
                  Profesionalismo
                </h3>
                <p className="text-sm text-foreground/70 sm:text-base">
                  Ofrece a tus clientes una experiencia moderna y profesional de reserva online.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-green-500" />
              <div>
                <h3 className="mb-1 text-lg font-semibold text-foreground">
                  Control total
                </h3>
                <p className="text-sm text-foreground/70 sm:text-base">
                  Tú decides qué servicios ofrecer, cuándo trabajar y cómo gestionar tu negocio.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative w-full border-t border-border bg-foreground py-16 text-center md:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-background sm:text-4xl md:text-5xl">
            ¿Listo para profesionalizar tu negocio?
          </h2>
          <p className="mb-8 text-base text-background/80 sm:text-lg md:text-xl">
            Solicita una demo personalizada y descubre cómo AppointMePro puede transformar tu forma de trabajar.
          </p>
          <Link to="/contact">
            <Button 
              size="lg" 
              variant="secondary"
              className="group h-12 rounded-full bg-background px-8 text-base font-semibold text-foreground transition-all hover:bg-background/90 sm:h-14 sm:text-lg"
            >
              Solicitar Demo Ahora
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
