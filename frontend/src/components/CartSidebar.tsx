import { X, Clock, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useBooking } from '@/context/BookingContext';
import { useState } from 'react';

/**
 * CartSidebar - Carrito lateral sticky con resumen de servicios seleccionados
 * 
 * Mejoras Mobile v2:
 * - Expandible en móvil para ver/eliminar servicios
 * - Muestra duración total junto al precio
 * - Touch targets adecuados para eliminar servicios
 * - Collapse/expand con animación suave
 * 
 * Mejores prácticas:
 * - Sticky en desktop, fixed bottom en móvil
 * - shadcn-ui components (Card, Button, Badge, Separator)
 * - Totales calculados automáticamente desde BookingContext
 * - Responsive: Versión compacta en móvil, completa en desktop
 * 
 * UX Mobile:
 * - Fixed bottom con altura dinámica
 * - Expandible para ver lista completa de servicios
 * - Muestra cantidad de items + duración + precio en collapsed
 * - Botones eliminar accesibles en expanded
 * 
 * UX Desktop:
 * - Card completo con lista de servicios
 * - Sticky al hacer scroll
 * - Altura ajustada con max-height y scroll
 */

interface CartSidebarProps {
  onConfirmBooking: () => void;
}

export default function CartSidebar({ onConfirmBooking }: CartSidebarProps) {
  const { cart, totalPrice, totalDuration, removeService, clearCart } = useBooking();
  const [isExpanded, setIsExpanded] = useState(false);

  const isEmpty = cart.length === 0;

  return (
    <div className="lg:sticky lg:top-20 h-fit">
      <Card className="border-0 lg:border lg:shadow-lg rounded-none lg:rounded-lg">
        {/* Header - Solo visible en desktop */}
        <CardHeader className="hidden lg:block">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span>Carrito</span>
            </div>
            {!isEmpty && (
              <Badge variant="secondary">{cart.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="py-3 px-4 lg:py-4 lg:px-6 space-y-3 lg:space-y-4">
          {isEmpty ? (
            /* Empty State - Solo desktop */
            <div className="hidden lg:block text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Tu carrito está vacío</p>
              <p className="text-xs mt-1">Agrega servicios para continuar</p>
            </div>
          ) : (
            <>
              {/* Mobile: Header expandible con totales */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="lg:hidden w-full flex items-center justify-between py-2 -mx-4 px-4 active:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5" />
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="text-xs">
                      {cart.length}
                    </Badge>
                    <span className="text-muted-foreground">•</span>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{totalDuration} min</span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {/* Lista de servicios - Expandible en móvil, siempre visible en desktop */}
              <div
                className={`
                  ${isExpanded ? 'block' : 'hidden'} 
                  lg:block
                  space-y-2 lg:space-y-3 
                  lg:max-h-[300px] lg:overflow-y-auto
                  -mx-4 px-4 lg:mx-0 lg:px-0
                `}
              >
                {cart.map(({ service, quantity }) => (
                  <div
                    key={service.id}
                    className="flex items-start justify-between gap-2 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {service.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{service.durationMinutes} min</span>
                        <span>×</span>
                        <span>{quantity}</span>
                      </div>
                      <p className="text-sm font-semibold mt-1">
                        ${(service.price * quantity).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => removeService(service.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {/* Botón limpiar carrito - Solo visible cuando expandido en móvil o siempre en desktop */}
                <Button
                  onClick={clearCart}
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                >
                  Limpiar carrito
                </Button>
              </div>

              <Separator className="hidden lg:block" />

              {/* Totales - Siempre visible */}
              <div className="flex items-center justify-between gap-4">
                {/* Duración - Visible en desktop, oculta en móvil (está en header expandible) */}
                <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{totalDuration} min</span>
                </div>

                {/* Total - Visible siempre */}
                <div className="flex items-center gap-2 lg:ml-auto">
                  <span className="text-sm lg:text-base font-semibold">Total:</span>
                  <span className="text-lg lg:text-xl font-bold">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 py-3 px-4 lg:py-4 lg:px-6">
          <Button
            onClick={onConfirmBooking}
            disabled={isEmpty}
            className="w-full h-10 lg:h-11 text-sm lg:text-base"
            size="lg"
          >
            Confirmar Reserva
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
