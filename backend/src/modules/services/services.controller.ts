import { Request, Response } from 'express';
import { AdminUser, Prisma } from '@prisma/client';
import * as service from './services.services';
import { CreateServiceDto, UpdateServiceDto } from './services.types';
import { ConflictError, NotFoundError } from '../../utils/error';
import logger from '../../utils/logger';


export const findAll = async (req: Request, res: Response) => {
  try {
    const { page, limit, categoryId } = req.query as Record<string, string | undefined>;
    const result = await service.getAllServices({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      categoryId: categoryId || undefined,
    });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    logger.error(error, "Error al obtener los servicios");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// NOTA: findOne eliminado - endpoint GET /:id no se usa en frontend (dead code removal)
// Justificación OWASP A01:2021: Reducir superficie de ataque eliminando código sin uso
// Justificación Mantenibilidad: Eliminar dead code facilita refactors y reduce deuda técnica

export const create = async (req: Request<{}, {}, CreateServiceDto>, res: Response) => {
  try {
    const admin = req.user as AdminUser;
    const adminId = admin.id;

    const newService = await service.createService(req.body, adminId);
    
    res.status(201).json(newService);
  } catch (error) {
    if (error instanceof service.ServiceValidationError) {
      logger.warn(error.message);
      return res.status(400).json({ message: error.message });
    }

    if (error instanceof ConflictError) {
      logger.warn(error.message);
      return res.status(409).json({ message: error.message });
    }
    logger.error(error, "Error al crear el servicio");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const update = async (req: Request<{ id: string }, {}, UpdateServiceDto>, res: Response) => {
  try {
    const updatedService = await service.updateService(req.params.id, req.body);
    res.status(200).json(updatedService);
  } catch (error) {
    if (error instanceof service.ServiceValidationError) {
      logger.warn(error.message);
      return res.status(400).json({ message: error.message });
    }

    if (error instanceof NotFoundError) {
      logger.warn(error.message);
      return res.status(404).json({ message: error.message });
    }
    
    logger.error(error, "Error al actualizar el servicio");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const remove = async (req: Request<{ id: string }>, res: Response) => {
  try {
    await service.deleteService(req.params.id);
    logger.info({ serviceId: req.params.id }, "Servicio eliminado correctamente");
    res.status(204).send(); 
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.warn(error.message);
      return res.status(404).json({ message: error.message });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      logger.warn({ serviceId: req.params.id }, "Servicio con reservas asociadas");
      return res.status(409).json({
        message: 'El servicio tiene reservas asociadas y no puede eliminarse.'
      });
    }

    logger.error(error, "Error al eliminar el servicio");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};