import { Clock, Plus, Minus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Service } from '@/types/service';
import { useBooking } from '@/context/BookingContext';

/**
 * ServicesTable - Componente tabla compacta reutilizable para mostrar servicios
 * 
 * Diseño tabla-like optimizado para:
 * - HomePage: Vista previa de servicios del profesional
 * - ServicesGridPage: Lista completa con carrito
 * 
 * Mejores prácticas React 19:
 * - Componente reutilizable con props configurables
 * - useBooking hook para estado global del carrito
 * - shadcn-ui Button y Badge exclusivamente
 * - Mobile-first responsive (tabla → lista en móvil)
 * 
 * Props:
 * - services: Array de servicios a mostrar
 * - showCategory: Mostrar columna de categoría (default: false)
 * - compact: Modo ultra-compacto para HomePage (default: false)
 * - maxItems: Límite de servicios a mostrar (default: todos)
 */

interface ServicesTableProps {
  services: Service[];
  showCategory?: boolean;
  compact?: boolean;
  maxItems?: number;
}

export default function ServicesTable({ 
  services, 
  showCategory = false, 
  compact = false,
  maxItems 
}: ServicesTableProps) {
  const { addService, removeService, getServiceQuantity } = useBooking();
  
  // Limitar servicios si se especifica maxItems
  const displayServices = maxItems ? services.slice(0, maxItems) : services;

  if (displayServices.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No hay servicios disponibles
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      {/* Vista Desktop - Tabla */}
      <div className="hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${compact ? 'text-xs' : 'text-sm'}`}>
              <th className="text-left font-semibold py-3 px-2">Servicio</th>
              {showCategory && (
                <th className="text-left font-semibold py-3 px-2">Categoría</th>
              )}
              <th className="text-center font-semibold py-3 px-2">Duración</th>
              <th className="text-right font-semibold py-3 px-2">Precio</th>
              <th className="text-right font-semibold py-3 px-2 w-32">Acción</th>
            </tr>
          </thead>
          <tbody>
            {displayServices.map((service) => {
              const quantity = getServiceQuantity(service.id);
              return (
                <tr 
                  key={service.id} 
                  className={`border-b last:border-b-0 hover:bg-muted/50 transition-colors ${
                    compact ? 'text-xs' : 'text-sm'
                  }`}
                >
                  {/* Nombre y descripción */}
                  <td className="py-3 px-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-foreground">
                        {service.name}
                      </span>
                      {!compact && service.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {service.description}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Categoría (opcional) */}
                  {showCategory && (
                    <td className="py-3 px-2">
                      <Badge variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {service.category?.name || 'Sin categoría'}
                      </Badge>
                    </td>
                  )}

                  {/* Duración */}
                  <td className="py-3 px-2 text-center">
                    <div className="inline-flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{service.durationMinutes} min</span>
                    </div>
                  </td>

                  {/* Precio */}
                  <td className="py-3 px-2 text-right font-semibold text-foreground">
                    ${new Intl.NumberFormat('es-UY').format(service.price)}
                  </td>

                  {/* Botones de acción */}
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-end gap-1">
                      {quantity > 0 ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeService(service.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Badge variant="secondary" className="min-w-[24px] justify-center">
                            {quantity}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addService(service)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => addService(service)}
                          className="h-8 px-3"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Agregar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vista Mobile - Lista Compacta Tipo Tabla */}
      <div className="sm:hidden space-y-1.5">
        {displayServices.map((service) => {
          const quantity = getServiceQuantity(service.id);
          return (
            <div
              key={service.id}
              className="border rounded-lg p-3 bg-card hover:bg-muted/50 transition-colors"
            >
              {/* Línea 1: Nombre + Badge */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm text-foreground leading-tight flex-1">
                  {service.name}
                </h3>
                {quantity > 0 && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {quantity}
                  </Badge>
                )}
              </div>

              {/* Línea 2: Descripción (si existe y no es compact) */}
              {!compact && service.description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                  {service.description}
                </p>
              )}

              {/* Línea 3: Info compacta (Categoría | Duración | Precio) */}
              <div className="flex items-center justify-between gap-2 mb-2.5 pb-2.5 border-b border-border">
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  {showCategory && service.category && (
                    <>
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {service.category.name}
                      </span>
                      <span className="text-border">•</span>
                    </>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {service.durationMinutes} min
                  </span>
                </div>
                <span className="font-semibold text-sm text-foreground">
                  ${new Intl.NumberFormat('es-UY').format(service.price)}
                </span>
              </div>

              {/* Línea 4: Botones de acción */}
              <div className="flex items-center justify-between gap-2">
                {quantity > 0 ? (
                  <>
                    <span className="text-xs text-muted-foreground">
                      {quantity} {quantity === 1 ? 'servicio' : 'servicios'} agregado{quantity > 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeService(service.id)}
                        className="h-9 w-9 p-0"
                        aria-label="Quitar uno"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addService(service)}
                        className="h-9 w-9 p-0"
                        aria-label="Agregar uno más"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground">
                      Disponible para reservar
                    </span>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => addService(service)}
                      className="h-9 px-4"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
