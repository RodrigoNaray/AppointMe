"use client"

import { useEffect, useState, useCallback, useMemo } from 'react';
import apiClient from '@/api/client';
import { Service, CreateServiceDto, UpdateServiceDto } from '@/types/service';
import { Category } from '@/types/service';
import { DataTable } from '@/components/shared/DataTable';
import { createServiceColumns } from './columns';
import Modal from '@/components/Modal';
import ServiceForm from '@/components/ServiceForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { PlusCircle, Clock, DollarSign, MoreVertical, Pencil, Trash2 } from 'lucide-react';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        apiClient.get<Service[]>('services'),
        apiClient.get<Category[]>('categories/admin'),
      ]);
      setServices(servicesRes.data);
      setCategories(categoriesRes.data);
    } catch (err) {
      console.error('No se pudieron cargar los datos.', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Filtrar servicios por categoría
  const filteredServices = useMemo(() => {
    if (selectedCategory === 'all') return services;
    return services.filter((service) => service.categoryId === selectedCategory);
  }, [services, selectedCategory]);

  // Filtrar solo categorías que tienen servicios (para tabs)
  const categoriesWithServices = useMemo(() => {
    return categories.filter((category) => {
      const count = services.filter((s) => s.categoryId === category.id).length;
      return count > 0;
    });
  }, [categories, services]);

  const handleOpenCreateModal = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: Service) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: CreateServiceDto | UpdateServiceDto) => {
    try {
      if (editingService) {
        await apiClient.put(`services/update/${editingService.id}`, data);
      } else {
        await apiClient.post('services', data);
      }
      setIsModalOpen(false);
      fetchServices();
    } catch (err) {
      console.error("Error al guardar el servicio:", err);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este servicio?")) {
      try {
        await apiClient.delete(`services/remove/${serviceId}`);
        fetchServices();
      } catch (err) {
        console.error("Error al eliminar el servicio:", err);
      }
    }
  };


  const columns = createServiceColumns({
    onEdit: handleOpenEditModal,
    onDelete: handleDeleteService
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground/20 border-t-foreground" />
    </div>
  );

  return (
  <div className="w-full max-w-full space-y-4 sm:space-y-6">
    {/* Header responsive */}
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">Gestión de Servicios</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
          Administra los servicios de tu negocio
        </p>
      </div>
      <Button onClick={handleOpenCreateModal} className="w-full sm:w-auto flex-shrink-0">
        <PlusCircle className="mr-2 h-4 w-4" /> 
        <span className="text-sm">Añadir</span>
      </Button>
    </div>

    {/* Tabs para filtrar por categoría - Responsive con scroll */}
    <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto flex-nowrap overflow-y-hidden snap-x snap-mandatory scroll-smooth scrollbar-hide gap-0.5 sm:gap-1 pl-0.5">
        <TabsTrigger value="all" className="snap-center whitespace-nowrap text-xs flex-shrink-0 px-2 sm:px-3">
          <span className="sm:hidden">Todos</span>
          <span className="hidden sm:inline">Todos ({services.length})</span>
        </TabsTrigger>
        {categoriesWithServices.map((category) => {
          const count = services.filter((s) => s.categoryId === category.id).length;
          return (
            <TabsTrigger 
              key={category.id} 
              value={category.id}
              className="snap-center whitespace-nowrap text-xs flex-shrink-0 px-2 sm:px-3"
            >
              <span className="sm:hidden">{category.name}</span>
              <span className="hidden sm:inline">{category.name} ({count})</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>

    {/* Vista Mobile - Cards */}
    <div className="block sm:hidden space-y-2">
      {filteredServices.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-xs text-muted-foreground">
            No hay servicios en esta categoría
          </CardContent>
        </Card>
      ) : (
        filteredServices.map((service) => (
          <Card key={service.id} className="overflow-hidden">
            <CardContent className="p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-semibold text-xs truncate">{service.name}</h3>
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <Badge variant="secondary" className="text-[9px] h-4 px-1">
                      {service.category?.name || 'Sin categoría'}
                    </Badge>
                    <div className="flex items-center gap-0.5 text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{service.durationMinutes}min</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-muted-foreground">
                      <DollarSign className="h-2.5 w-2.5" />
                      <span className="text-[10px]">
                        {new Intl.NumberFormat("es-UY", {
                          style: "currency",
                          currency: "UYU",
                        }).format(service.price)}
                      </span>
                    </div>
                  </div>
                  {service.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-1 leading-relaxed">
                      {service.description}
                    </p>
                  )}
                </div>
                
                {/* Menú de acciones mobile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                      <MoreVertical className="h-3.5 w-3.5" />
                      <span className="sr-only">Abrir menú</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEditModal(service)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteService(service.id)}
                      className="text-red-500 focus:bg-red-50 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>

    {/* Vista Desktop - DataTable */}
    <div className="hidden sm:block">
      <DataTable columns={columns} data={filteredServices} />
    </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingService ? "Editar Servicio" : "Añadir Nuevo Servicio"}
      >
        <ServiceForm 
          onCancel={() => setIsModalOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={editingService}
        />
      </Modal>
    </div>
  );
}