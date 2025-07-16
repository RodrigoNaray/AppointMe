"use client"

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/api/client';
import { Service, CreateServiceDto, UpdateServiceDto } from '@/types/service';
import { DataTable } from '@/components/shared/DataTable';
import { createServiceColumns } from './columns';
import Modal from '@/components/Modal';
import ServiceForm from '@/components/ServiceForm';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<Service[]>('api/services');
      setServices(response.data);
    } catch (err) {
      console.error('No se pudieron cargar los servicios.', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

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
        await apiClient.put(`api/services/update/${editingService.id}`, data);
      } else {
        await apiClient.post('api/services', data);
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
        await apiClient.delete(`api/services/remove/${serviceId}`);
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

  if (isLoading) return <p>Cargando servicios...</p>;

  return (
    <div className='w-full'>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Servicios</h1>
        <button onClick={handleOpenCreateModal} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900">
          + Añadir Servicio
        </button>
      </div>

      <DataTable columns={columns} data={services} />

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