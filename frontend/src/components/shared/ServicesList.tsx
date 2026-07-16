import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import ServicesTable from '@/components/shared/ServicesTable';
import type { Service, Category } from '@/types/service';
import { getServices, getCategories } from '@/api/modules/services';
import type { PaginationResponse } from '@/api/modules/services';

interface ServicesListProps {
  itemsPerPage?: number;
}

export default function ServicesList({ itemsPerPage = 12 }: ServicesListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<PaginationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = searchParams.get('category') ?? 'all';
  const currentPage = Number(searchParams.get('page') ?? '1') || 1;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getServices({
        page: currentPage,
        limit: itemsPerPage,
        categoryId: selectedCategory === 'all' ? null : selectedCategory,
      }),
      categories.length ? Promise.resolve(categories) : getCategories(),
    ])
      .then(([res, cats]) => {
        if (cancelled) return;
        setServices(res.services);
        setPagination(res.pagination);
        if (cats !== categories) setCategories(cats as Category[]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar los datos');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentPage, selectedCategory, itemsPerPage]);

  const handleCategoryChange = useCallback((value: string) => {
    setSearchParams((prev) => {
      if (value === 'all') {
        prev.delete('category');
      } else {
        prev.set('category', value);
      }
      prev.set('page', '1');
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  const handlePageChange = useCallback((page: number) => {
    const totalPages = pagination?.total_pages ?? 1;
    if (page >= 1 && page <= totalPages) {
      setSearchParams((prev) => {
        prev.set('page', String(page));
        return prev;
      }, { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [setSearchParams, pagination]);

  const totalAll = categories.reduce((acc, c) => acc + (c._count?.services ?? 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Cargando servicios...</span>
      </div>
    );
  }

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

  if (pagination && pagination.total_count === 0 && selectedCategory === 'all') {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-muted-foreground">No hay servicios disponibles</p>
      </div>
    );
  }

  const totalPages = pagination?.total_pages ?? 1;
  const showCategory = selectedCategory === 'all';

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs value={selectedCategory} onValueChange={handleCategoryChange}>
        <TabsList className="w-full justify-start overflow-x-auto flex gap-0.5 sm:gap-1 scrollbar-hide snap-x snap-mandatory scroll-smooth">
          <TabsTrigger
            value="all"
            className="flex-shrink-0 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap snap-center"
          >
            <span className="sm:hidden">Todos</span>
            <span className="hidden sm:inline">Todos ({totalAll})</span>
          </TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="flex-shrink-0 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap snap-center"
            >
              <span className="sm:hidden">{category.name}</span>
              <span className="hidden sm:inline">{category.name} ({category._count?.services ?? 0})</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-4 sm:mt-6">
          {services.length === 0 ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <p className="text-sm sm:text-base text-muted-foreground">
                No hay servicios en esta categoría
              </p>
            </div>
          ) : (
            <>
              <ServicesTable
                services={services}
                showCategory={showCategory}
              />

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

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        const showPage =
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1);

                        if (!showPage) {
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
