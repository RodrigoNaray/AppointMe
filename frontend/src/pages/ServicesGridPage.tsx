import ServicesList from '@/components/shared/ServicesList';
import CartSidebar from '@/components/CartSidebar';
import { useBookingStore, selectCart } from '@/stores/bookingStore';
import { PageContainer } from "@/components/layout/PageContainer";
import { useScrollReveal } from '@/hooks/useScrollReveal';

/**
 * ServicesGridPage - Página principal de reservas con categorías y carrito
 * 
 * Arquitectura:
 * - ServicesList: Grid responsive con Tabs de categorías + paginación
 * - Carrito sticky lateral en desktop
 * - Layout: 2 columnas en desktop (servicios + carrito)
 * 
 * Responsive mejoras v2:
 * - Mobile: Carrito fixed bottom con altura dinámica según contenido
 * - Desktop: Carrito sticky a la derecha
 * - Padding bottom dinámico: más espacio cuando hay items (carrito expandible)
 * 
 * React 19 best practices:
 * - Composición de componentes reutilizables
 * - ServicesList maneja su propio estado de datos
 * - CartSidebar maneja estado de carrito (Zustand bookingStore)
 * - Padding dinámico según estado (mejora UX sin overlap)
 * 
 * Referencias:
 * - React Composition: https://react.dev/learn/thinking-in-react
 * - Separation of Concerns: ServicesList = datos, CartSidebar = carrito
 * - Mobile UX: Bottom sheet pattern para carrito en móvil
 * - Dynamic spacing: Ajuste según contenido para evitar overlap
 */

export default function ServicesGridPage() {
  const cart = useBookingStore(selectCart);
  const hasItems = cart.length > 0;
  const reveal = useScrollReveal(0.1);

  return (
    <PageContainer maxWidth="4xl" padding="none">
      <div ref={reveal.ref} className={`px-4 py-6 sm:py-8 ${hasItems ? 'pb-64' : 'pb-32'} sm:pb-32 lg:pb-8 ${reveal.isVisible ? 'visible' : ''} animate-reveal`}>
      {/* Header - Responsive */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
          Nuestros Servicios
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Selecciona los servicios que deseas reservar
        </p>
      </div>

      {/* Layout Grid Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:items-start">
        {/* Lista de servicios con categorías (Tabs + Tabla + Pagination) */}
        <div className="lg:col-span-2">
          <ServicesList itemsPerPage={8} />
        </div>

        {/* Carrito - Hidden en móvil (se muestra fixed bottom) */}
        <div className="hidden lg:block lg:col-span-1 lg:h-[450px]">
          <CartSidebar />
        </div>
      </div>

      {/* Carrito Fixed Bottom - Solo móvil */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background shadow-2xl">
        <CartSidebar />
      </div>
      </div>
    </PageContainer>
  );
}
