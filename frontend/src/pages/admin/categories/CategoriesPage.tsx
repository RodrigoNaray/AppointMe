"use client"

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import apiClient from '@/api/client';
import { Category } from '@/types/service';
import { DataTable } from '@/components/shared/DataTable';
import { createCategoryColumns } from './columns';
import CategoryForm, { CategoryFormData } from '@/components/CategoryForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { PageSkeleton } from '@/components/admin/PageSkeleton';
import { EmptyState } from '@/components/admin/EmptyState';

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
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Fetch de categorías (con memoización para evitar recreación)
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      // Endpoint admin que incluye todas las categorías con conteo
      const response = await apiClient.get<Category[]>('categories/admin');
      setCategories(response.data);
    } catch (err) {
      console.error('No se pudieron cargar las categorías.', err);
      toast.error('No se pudieron cargar las categorías. Intenta de nuevo.');
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
        toast.success(`La categoría "${data.name}" se actualizó correctamente.`);
      } else {
        // Crear nueva categoría
        await apiClient.post('categories/admin', data);
        toast.success(`La categoría "${data.name}" se creó correctamente.`);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      console.error('Error al guardar la categoría:', err);
      
      // Manejo de errores específicos
      const errorMessage = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message || 'Error desconocido'
        : 'Error desconocido';
      
      toast.error(`Error al guardar categoría: ${errorMessage}`);
    }
  };

  // Eliminar categoría con confirmación
  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    const serviceCount = category._count?.services || 0;
    if (serviceCount > 0) {
      toast.error(`No se puede eliminar. La categoría "${category.name}" tiene ${serviceCount} servicio(s) asociado(s). Elimina o reasigna los servicios primero.`);
      return;
    }

    setCategoryToDelete(category);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const categoryName = categoryToDelete.name;
    try {
      await apiClient.delete(`categories/admin/${categoryToDelete.id}`);
      toast.success(`La categoría "${categoryName}" se eliminó correctamente.`);
      fetchCategories();
    } catch (err: unknown) {
      console.error('Error al eliminar la categoría:', err);
      const errorMessage = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message || 'Error al eliminar la categoría'
        : 'Error al eliminar la categoría';
      toast.error(`Error al eliminar: ${errorMessage}`);
    } finally {
      setCategoryToDelete(null);
    }
  };

  // Crear columnas con callbacks
  const columns = createCategoryColumns({
    onEdit: handleOpenEditModal,
    onDelete: handleDeleteCategory,
  });

  // Loading state
  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header con título y botón crear - RESPONSIVE */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gestión de Categorías</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Administra las categorías de servicios de tu negocio
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Nueva Categoría
        </Button>
      </div>

      {/* Vista MOBILE: Cards */}
      <div className="md:hidden space-y-3">
        {categories.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Sin categorías"
            description="Organizá tus servicios en categorías."
            actionLabel="Crear categoría"
            onAction={handleOpenCreateModal}
          />
        ) : (
          categories.map((category) => (
            <Card key={category.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header: Nombre + Estado */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Tag className="h-4 w-4 text-primary flex-shrink-0" />
                      <h3 className="font-semibold text-base truncate">{category.name}</h3>
                    </div>
                    <Badge variant={category.isActive ? "default" : "secondary"} className="text-xs flex-shrink-0">
                      {category.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>

                  {/* Descripción */}
                  {category.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {category.description}
                    </p>
                  )}

                  {/* Info adicional - Solo mostrar si tiene servicios */}
                  {category._count?.services && category._count.services > 0 && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{category._count.services}</span> servicios
                      </span>
                      <span>
                        {new Intl.DateTimeFormat("es-UY", { dateStyle: "short" }).format(new Date(category.createdAt))}
                      </span>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenEditModal(category)}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={(category._count?.services ?? 0) > 0}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Eliminar
                    </Button>
                  </div>

                  {/* Mensaje si no se puede eliminar */}
                  {(category._count?.services ?? 0) > 0 && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      No se puede eliminar (tiene servicios asociados)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Vista DESKTOP: Tabla */}
      <div className="hidden md:block">
        <DataTable columns={columns} data={categories} />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
          </DialogHeader>
          <CategoryForm
            onCancel={() => setIsModalOpen(false)}
            onSubmit={handleFormSubmit}
            initialData={editingCategory}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={categoryToDelete !== null}
        onOpenChange={(open) => { if (!open) setCategoryToDelete(null); }}
        title="Eliminar categoría"
        description={`¿Seguro que querés eliminar "${categoryToDelete?.name ?? ''}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDeleteCategory}
        destructive
      />
    </div>
  );
}
