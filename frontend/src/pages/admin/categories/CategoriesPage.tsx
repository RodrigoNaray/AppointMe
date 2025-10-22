"use client"

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/api/client';
import { Category } from '@/types/service';
import { DataTable } from '@/components/shared/DataTable';
import { createCategoryColumns } from './columns';
import Modal from '@/components/Modal';
import CategoryForm, { CategoryFormData } from '@/components/CategoryForm';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * CategoriesPage - Página de gestión de categorías (Admin)
 * 
 * Mejores prácticas:
 * - React 19 best practices: useCallback para funciones estables
 * - shadcn-ui DataTable con columnas dinámicas
 * - Modal de shadcn-ui para crear/editar
 * - Toast notifications para feedback
 * - Validación de eliminación (categorías con servicios)
 * - Error handling exhaustivo
 * 
 * Arquitectura:
 * - DataTable: Tabla sorteable con acciones por fila
 * - CategoryForm: Formulario reutilizable para crear/editar
 * - API calls: GET, POST, PUT, DELETE con manejo de errores
 * 
 * Referencias:
 * - React Patterns: https://react.dev/learn/managing-state
 * - shadcn-ui DataTable: https://ui.shadcn.com/docs/components/data-table
 * - OWASP Input Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
 */

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Fetch de categorías (con memoización para evitar recreación)
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      // Endpoint admin que incluye todas las categorías con conteo
      const response = await apiClient.get<Category[]>('categories/admin');
      setCategories(response.data);
    } catch (err) {
      console.error('No se pudieron cargar las categorías.', err);
      toast.error('Error al cargar categorías', {
        description: 'No se pudieron cargar las categorías. Intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Abrir modal para crear nueva categoría
  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  // Abrir modal para editar categoría existente
  const handleOpenEditModal = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  // Submit del formulario (crear o editar)
  const handleFormSubmit = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        // Actualizar categoría existente
        await apiClient.put(`categories/admin/${editingCategory.id}`, data);
        toast.success('Categoría actualizada', {
          description: `La categoría "${data.name}" se actualizó correctamente.`,
        });
      } else {
        // Crear nueva categoría
        await apiClient.post('categories/admin', data);
        toast.success('Categoría creada', {
          description: `La categoría "${data.name}" se creó correctamente.`,
        });
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      console.error('Error al guardar la categoría:', err);
      
      // Manejo de errores específicos
      const errorMessage = err.response?.data?.message || 'Error desconocido';
      
      toast.error('Error al guardar categoría', {
        description: errorMessage,
      });
    }
  };

  // Eliminar categoría con confirmación
  const handleDeleteCategory = async (categoryId: string) => {
    // Buscar categoría para mostrar nombre en confirmación
    const category = categories.find((c) => c.id === categoryId);
    const categoryName = category?.name || 'esta categoría';
    
    // Validar si tiene servicios
    const serviceCount = category?._count?.services || 0;
    if (serviceCount > 0) {
      toast.error('No se puede eliminar', {
        description: `La categoría "${categoryName}" tiene ${serviceCount} servicio(s) asociado(s). Elimina o reasigna los servicios primero.`,
      });
      return;
    }

    if (window.confirm(`¿Estás seguro de que quieres eliminar la categoría "${categoryName}"?`)) {
      try {
        await apiClient.delete(`categories/admin/${categoryId}`);
        toast.success('Categoría eliminada', {
          description: `La categoría "${categoryName}" se eliminó correctamente.`,
        });
        fetchCategories();
      } catch (err: any) {
        console.error('Error al eliminar la categoría:', err);
        
        const errorMessage = err.response?.data?.message || 'Error al eliminar la categoría';
        
        toast.error('Error al eliminar', {
          description: errorMessage,
        });
      }
    }
  };

  // Crear columnas con callbacks
  const columns = createCategoryColumns({
    onEdit: handleOpenEditModal,
    onDelete: handleDeleteCategory,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando categorías...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header con título y botón crear */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Categorías</h1>
          <p className="text-muted-foreground mt-1">
            Administra las categorías de servicios de tu negocio
          </p>
        </div>
        <Button onClick={handleOpenCreateModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nueva Categoría
        </Button>
      </div>

      {/* Tabla de categorías */}
      <DataTable columns={columns} data={categories} />

      {/* Modal para crear/editar */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
      >
        <CategoryForm 
          onCancel={() => setIsModalOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={editingCategory}
        />
      </Modal>
    </div>
  );
}
