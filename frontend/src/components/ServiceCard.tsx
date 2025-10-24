import { Clock, DollarSign, Plus, Minus } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Service } from '@/types/service';
import { useBookingStore, selectAddService, selectRemoveService } from '@/stores/bookingStore';

/**
 * ServiceCard - Card de shadcn-ui para mostrar servicio con opción de agregar al carrito
 * 
 * Mejores prácticas:
 * - shadcn-ui components exclusivamente (Card, Button, Badge)
 * - Iconos de lucide-react consistentes con el proyecto
 * - Hover effects con Tailwind (hover:scale-105 transition)
 * - Responsive design mobile-first
 * 
 * Mejoras Mobile:
 * - Hover effect solo en desktop (evita problemas táctiles)
 * - Padding y tamaños de fuente ajustados
 * - Botones con touch targets adecuados (min 44px altura)
 * 
 * Props:
 * - service: Datos del servicio desde backend
 */

interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const addService = useBookingStore(selectAddService);
  const removeService = useBookingStore(selectRemoveService);
  const quantity = useBookingStore((state) => state.getServiceQuantity(service.id));

  return (
    <Card className="group lg:hover:scale-105 transition-transform duration-200 lg:hover:shadow-lg h-full flex flex-col">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="flex items-start justify-between gap-2">
          <span className="font-semibold text-base sm:text-lg leading-tight">
            {service.name}
          </span>
          {quantity > 0 && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {quantity}
            </Badge>
          )}
        </CardTitle>
        {service.description && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
            {service.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-2 sm:space-y-3 pb-3 sm:pb-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground/80">
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>{service.durationMinutes} min</span>
        </div>

        <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-foreground">
          <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>${service.price.toFixed(2)}</span>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 mt-auto pt-3 sm:pt-4">
        {quantity === 0 ? (
          <Button
            onClick={() => addService(service)}
            className="w-full flex items-center justify-center gap-2 h-10 sm:h-11 text-sm sm:text-base"
            variant="default"
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Agregar
          </Button>
        ) : (
          <>
            <Button
              onClick={() => removeService(service.id)}
              variant="outline"
              size="icon"
              className="flex-shrink-0 h-10 w-10 sm:h-11 sm:w-11"
            >
              <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              onClick={() => addService(service)}
              variant="default"
              className="flex-1 flex items-center justify-center gap-2 h-10 sm:h-11 text-sm sm:text-base"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Agregar más</span>
              <span className="sm:hidden">Más</span>
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
