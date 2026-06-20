import prisma from '../../config/prisma';
import logger from '../../utils/logger';
import { CreateCategoryDto, UpdateCategoryDto } from './category.types';
import { ConflictError, NotFoundError } from '../../utils/error';

/**
 * Obtiene todas las categorías (globales para toda la plataforma)
 * 
 * Best practice: Incluir conteo de servicios para mostrar en UI
 * React 19: Devolver datos necesarios para evitar múltiples requests
 */
export const getAllCategories = async () => {
  return prisma.category.findMany({
    include: {
      _count: {
        select: { services: true }, // Contar servicios por categoría
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Obtiene categorías públicas (para clientes sin autenticar)
 * Solo devuelve categorías activas con al menos un servicio activo
 */
export const getPublicCategories = async () => {
  return prisma.category.findMany({
    where: {
      isActive: true,
      services: {
        some: { isActive: true }, // Solo categorías con servicios activos
      },
    },
    include: {
      _count: {
        select: { services: true },
      },
    },
    orderBy: { name: 'asc' },
  });
};

/**
 * Obtiene una categoría por ID (global)
 */
export const getCategoryById = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      services: true, // Incluir servicios de la categoría
    },
  });

  if (!category) {
    logger.warn({ categoryId: id }, 'Intento de obtener categoría que no existe');
    throw new NotFoundError(`La categoría con ID '${id}' no fue encontrada.`);
  }

  return category;
};

/**
 * Crea una nueva categoría (global)
 * 
 * OWASP: Validar que el nombre no exista para evitar duplicados
 * Prisma: unique constraint en schema.prisma (name)
 */
export const createCategory = async (data: CreateCategoryDto) => {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw new Error('El nombre de la categoría es requerido');
  }
  if (data.name.length > 100) {
    throw new Error('El nombre de la categoría no puede exceder los 100 caracteres');
  }

  const existing = await prisma.category.findUnique({
    where: { name: data.name },
  });

  if (existing) {
    throw new ConflictError(`Ya existe una categoría con el nombre '${data.name}'`);
  }

  const newCategory = await prisma.category.create({
    data,
  });

  logger.info({ categoryId: newCategory.id, categoryName: newCategory.name }, 'Nueva categoría creada');
  return newCategory;
};

/**
 * Actualiza una categoría existente (global)
 */
export const updateCategory = async (id: string, data: UpdateCategoryDto) => {
  await getCategoryById(id); // Verificar que existe

  // Si se actualiza el nombre, validar que no exista otro con ese nombre
  if (data.name) {
    const existing = await prisma.category.findFirst({
      where: {
        name: data.name,
        NOT: { id }, // Excluir la categoría actual
      },
    });

    if (existing) {
      throw new ConflictError(`Ya existe una categoría con el nombre '${data.name}'`);
    }
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data,
  });

  logger.info({ categoryId: updatedCategory.id }, 'Categoría actualizada correctamente');
  return updatedCategory;
};

/**
 * Elimina una categoría (global)
 * 
 * IMPORTANTE: onDelete: Restrict en schema.prisma previene eliminar
 * categorías con servicios asociados (data integrity)
 */
export const deleteCategory = async (id: string): Promise<void> => {
  const category = await getCategoryById(id);

  // Verificar si tiene servicios asociados
  const servicesCount = await prisma.service.count({
    where: { categoryId: id },
  });

  if (servicesCount > 0) {
    throw new ConflictError(
      `No se puede eliminar la categoría '${category.name}' porque tiene ${servicesCount} servicio(s) asociado(s). ` +
      `Desactívala o elimina primero los servicios.`
    );
  }

  await prisma.category.delete({ where: { id } });
  logger.info({ categoryId: id }, 'Categoría eliminada correctamente');
};
