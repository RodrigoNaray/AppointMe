import prisma from '../../config/prisma';
import logger from '../../utils/logger'; 
import { CreateServiceDto, UpdateServiceDto } from './services.types';
import { ConflictError, NotFoundError } from '../../utils/error';

export class ServiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceValidationError';
  }
}

const validateServicePayload = (data: CreateServiceDto | UpdateServiceDto): void => {
  if (typeof data.name === 'string' && (data.name.trim().length === 0 || data.name.length > 100)) {
    throw new ServiceValidationError('El nombre debe tener entre 1 y 100 caracteres.');
  }

  if (typeof data.durationMinutes === 'number' && data.durationMinutes <= 0) {
    throw new ServiceValidationError('La duración debe ser mayor a 0 minutos.');
  }

  if (typeof data.price === 'number' && data.price < 0) {
    throw new ServiceValidationError('El precio no puede ser negativo.');
  }
};

/**
 * Obtiene todos los servicios con sus categorías asociadas
 * React 19 best practice: Incluir relaciones necesarias para evitar N+1 queries
 */
export const getAllServices = async (query?: { page?: number; limit?: number; categoryId?: string }) => {
  const page = Number.isFinite(query?.page) && (query?.page ?? 1) > 0 ? query!.page! : 1;
  const limit = Math.min(
    Number.isFinite(query?.limit) && (query?.limit ?? 8) > 0 ? query!.limit! : 8,
    100
  );
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isActive: true };
  if (query?.categoryId) {
    where.categoryId = query.categoryId;
  }

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      include: { category: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.service.count({ where }),
  ]);

  return {
    services,
    pagination: {
      current_page: page,
      total_pages: Math.ceil(total / limit),
      total_count: total,
      per_page: limit,
    },
  };
};

export const getServiceById = async (id: string) => {
  const service = await prisma.service.findUnique({ 
    where: { id },
    include: { category: true },
  });

  if (!service) {
    logger.warn({ serviceId: id }, "Intento de obtener un servicio que no existe");
    throw new NotFoundError(`El servicio con ID '${id}' no fue encontrado.`);
  }
  return service;
};

/**
 * Valida que una categoría existe y está activa
 * @throws NotFoundError si la categoría no existe o está inactiva
 */
const validateCategoryExists = async (categoryId: string) => {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  
  if (!category) {
    throw new NotFoundError(`La categoría con ID '${categoryId}' no fue encontrada.`);
  }
  
  if (!category.isActive) {
    throw new ConflictError(`La categoría '${category.name}' está desactivada.`);
  }
  
  return category;
};

export const createService = async (data: CreateServiceDto, adminId: string) => {
  validateServicePayload(data);

  // Validar que la categoría existe y está activa
  await validateCategoryExists(data.categoryId);
  
  const existing = await prisma.service.findFirst({ where: { name: data.name } });
  if(existing) {
    throw new ConflictError(`Ya existe un servicio con el nombre '${data.name}'`);
  }

  const newService = await prisma.service.create({ 
    data: {
      ...data,
      adminId: adminId,
    },
    include: { category: true },
  });
  logger.info({ serviceId: newService.id, serviceName: newService.name }, "Nuevo servicio creado");
  return newService;
};

export const updateService = async (id: string, data: UpdateServiceDto) => {
  validateServicePayload(data);

  await getServiceById(id);
  
  // Si se está actualizando la categoría, validar que existe
  if (data.categoryId) {
    await validateCategoryExists(data.categoryId);
  }
  
  const updatedService = await prisma.service.update({ 
    where: { id }, 
    data,
    include: { category: true },
  });
  logger.info({ serviceId: updatedService.id }, "Servicio actualizado correctamente");
  return updatedService;
};

export const deleteService = async (id: string): Promise<void> => {
  await getServiceById(id);
  await prisma.service.delete({ where: { id } });
  logger.info({ serviceId: id }, "Servicio eliminado correctamente");
};