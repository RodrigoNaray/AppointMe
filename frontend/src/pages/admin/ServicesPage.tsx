// frontend/src/pages/admin/ServicesPage.tsx
import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import { Service, CreateServiceDto, UpdateServiceDto } from '../../types/service';
import Modal from '../../components/Modal';
import ServiceForm from '../../components/ServiceForm';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 1. Nuevo estado para guardar el servicio que se está editando
  const [editingService, setEditingService] = useState<Service | null>(null);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<Service[]>('/services');
      setServices(response.data);
    } catch (err) {
      setError('No se pudieron cargar los servicios.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // 2. Funciones para abrir el modal en modo 'crear' o 'editar'
  const handleOpenCreateModal = () => {
    setEditingService(null); // Nos aseguramos de que no haya datos iniciales
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: Service) => {
    setEditingService(service); // Guardamos los datos del servicio a editar
    setIsModalOpen(true);
  };

  // 3. Función para manejar el envío del formulario
  const handleFormSubmit = async (data: CreateServiceDto | UpdateServiceDto) => {
    try {
      if (editingService) {
        // Modo Edición
        await apiClient.put(`/services/${editingService.id}`, data);
      } else {
        // Modo Creación
        await apiClient.post('/services', data);
      }
      setIsModalOpen(false);
      fetchServices(); // Refrescamos la tabla
    } catch (err) {
      console.error("Error al guardar el servicio:", err);
    }
  };

  // 4. Nueva función para manejar el borrado
  const handleDeleteService = async (serviceId: string) => {
    // Pedimos confirmación antes de una acción destructiva
    if (window.confirm("¿Estás seguro de que quieres eliminar este servicio?")) {
      try {
        await apiClient.delete(`/services/${serviceId}`);
        fetchServices(); // Refrescamos la tabla
      } catch (err) {
        console.error("Error al eliminar el servicio:", err);
      }
    }
  };

  if (isLoading) return <p>Cargando servicios...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Servicios</h1>
        <button onClick={handleOpenCreateModal} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900">
          + Añadir Servicio
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          {/* ... (el <thead> de tu tabla se mantiene igual) ... */}
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                {/* ... (los <td> de name, durationMinutes, price se mantienen igual) ... */}
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                  {/* 5. Conectamos los botones a las nuevas funciones */}
                  <button onClick={() => handleOpenEditModal(service)} className="text-indigo-600 hover:text-indigo-900">Editar</button>
                  <button onClick={() => handleDeleteService(service.id)} className="text-red-600 hover:text-red-900 ml-4">Borrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* El modal ahora es más inteligente */}
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