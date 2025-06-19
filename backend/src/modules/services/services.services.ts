import prisma from '../../config/prisma';
import logger from '../../utils/logger'; 
import { CreateServiceDto, UpdateServiceDto } from './services.types';
import { ConflictError, NotFoundError } from '../../utils/error';

export const getAllServices = async () => {
  return prisma.service.findMany();
};

export const getServiceById = async (id: string) => {
  const service = await prisma.service.findUnique({ where: { id } });

  if (!service) {
    logger.warn({ serviceId: id }, "Intento de obtener un servicio que no existe");
    throw new NotFoundError(`El servicio con ID '${id}' no fue encontrado.`);
  }
  return service;
};

export const createService = async (data: CreateServiceDto) => {
  const existing = await prisma.service.findFirst({ where: { name: data.name } });
  if(existing) {
    throw new ConflictError(`Ya existe un servicio con el nombre '${data.name}'`);
  }

  const newService = await prisma.service.create({ data });
  logger.info({ serviceId: newService.id, serviceName: newService.name }, "Nuevo servicio creado");
  return newService;
};

export const updateService = async (id: string, data: UpdateServiceDto) => {
  await getServiceById(id); 
  const updatedService = await prisma.service.update({ where: { id }, data });
  logger.info({ serviceId: updatedService.id }, "Servicio actualizado correctamente");
  return updatedService;
};

export const deleteService = async (id: string): Promise<void> => {
  await getServiceById(id);
  await prisma.service.delete({ where: { id } });
  logger.info({ serviceId: id }, "Servicio eliminado correctamente");
};