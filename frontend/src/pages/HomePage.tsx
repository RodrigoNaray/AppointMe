import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarCheck, List, MousePointerClick } from "lucide-react";

export default function HomePage() {
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