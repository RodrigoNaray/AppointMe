import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import ServiceCard from '@/components/ServiceCard';
import type { Service, Category } from '@/types/service';
import { API_BASE_URL } from '@/api/config';

/**
 * ServicesList - Componente reutilizable con Tabs de categorías y paginación
 * 
 * Mejores prácticas React 19:
 * - useMemo para cálculos costosos (filtrado + paginación)
 * - useState para estado local (servicios, categorías, página actual)
 * - useEffect para fetch de datos en mount
 * - shadcn-ui Tabs para filtros por categoría
 * - Pagination cliente-side (mejor UX que server-side para datasets pequeños)
 * 
 * Arquitectura:
 * - Fetch de servicios y categorías desde API pública
 * - Filtrado por categoría seleccionada (tab activo)
 * - Paginación cliente-side con 9 servicios por página
 * - Grid responsive: 1 col móvil, 2 cols tablet, 3 cols desktop
 * 
 * Referencias:
 * - React 19 useMemo: https://react.dev/reference/react/useMemo
 * - shadcn-ui Tabs: https://ui.shadcn.com/docs/components/tabs
 * - shadcn-ui Pagination: https://ui.shadcn.com/docs/components/pagination
 */

interface ServicesListProps {
  /** Número de servicios por página (default: 9 para grid 3x3) */
  itemsPerPage?: number;
}

export default function ServicesList({ itemsPerPage = 9 }: ServicesListProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch de servicios y categorías al montar el componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

        // Fetch paralelo para mejor performance (Promise.all)
        const [servicesRes, categoriesRes] = await Promise.all([
          fetch(`${baseUrl}/services`),
          fetch(`${baseUrl}/categories`),
        ]);

        if (!servicesRes.ok || !categoriesRes.ok) {
          throw new Error('Error al cargar los datos');
        }

        const [servicesData, categoriesData] = await Promise.all([
          servicesRes.json(),
          categoriesRes.json(),
        ]);

        setServices(servicesData);
        setCategories(categoriesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtrar servicios por categoría seleccionada (memoizado para performance)
  const filteredServices = useMemo(() => {
    if (selectedCategory === 'all') {
      return services;
    }
    return services.filter((service) => service.categoryId === selectedCategory);
  }, [services, selectedCategory]);

  // Calcular total de páginas
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

  // Resetear a página 1 cuando cambia el filtro de categoría
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Servicios de la página actual (memoizado)
  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredServices.slice(startIndex, endIndex);
  }, [filteredServices, currentPage, itemsPerPage]);

  // Handler para cambiar categoría
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  // Handler para cambiar página
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll suave al inicio de la lista
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Cargando servicios...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive font-semibold">Error al cargar servicios</p>
          <p className="text-muted-foreground text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (services.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-muted-foreground">No hay servicios disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tabs de categorías */}
      <Tabs value={selectedCategory} onValueChange={handleCategoryChange}>
        {/* TabsList con scroll horizontal optimizado para móvil */}
        <div className="relative -mx-4 sm:mx-0">
          <TabsList className="w-full justify-start overflow-x-auto flex px-4 sm:px-0 gap-1 scrollbar-hide">
            <TabsTrigger value="all" className="flex-shrink-0 text-[11px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2">
              Todos ({services.length})
            </TabsTrigger>
            {categories.map((category) => {
              const count = services.filter((s) => s.categoryId === category.id).length;
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex-shrink-0 text-[11px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2"
                >
                  {category.name} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Content no es necesario por tab, solo renderizamos el grid */}
        <TabsContent value={selectedCategory} className="mt-4 sm:mt-6">
          {/* Empty state para categoría sin servicios */}
          {filteredServices.length === 0 ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <p className="text-sm sm:text-base text-muted-foreground">
                No hay servicios en esta categoría
              </p>
            </div>
          ) : (
            <>
              {/* Grid de servicios - Responsive optimizado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {paginatedServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>

              {/* Paginación (solo mostrar si hay más de 1 página) */}
              {totalPages > 1 && (
                <div className="mt-6 sm:mt-8">
                  <Pagination>
                    <PaginationContent className="flex-wrap gap-1">
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(currentPage - 1)}
                          size="default"
                          className={
                            currentPage === 1
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>

                      {/* Páginas */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Mostrar solo páginas cercanas a la actual (max 7 páginas visibles)
                        const showPage =
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1);

                        if (!showPage) {
                          // Mostrar ellipsis solo una vez entre grupos
                          if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return null;
                        }

                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handlePageChange(page)}
                              isActive={currentPage === page}
                              size="default"
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(currentPage + 1)}
                          size="default"
                          className={
                            currentPage === totalPages
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
