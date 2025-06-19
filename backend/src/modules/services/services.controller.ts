import { Request, Response } from 'express';
import * as service from './services.services';
import { CreateServiceDto, UpdateServiceDto } from './services.types';
import { ConflictError, NotFoundError } from '../../utils/error';
import logger from '../../utils/logger';


export const findAll = async (req: Request, res: Response) => {
  try {
    const services = await service.getAllServices();
    res.status(200).json(services);
  } catch (error) {
    logger.error(error, "Error al obtener los servicios");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const findOne = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const foundService = await service.getServiceById(req.params.id);
    res.status(200).json(foundService);
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.warn(error.message);
      return res.status(404).json({ message: error.message });
    }
    logger.error(error, "Error al obtener el servicio");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const create = async (req: Request<{}, {}, CreateServiceDto>, res: Response) => {
  try {
    const newService = await service.createService(req.body);
    res.status(201).json(newService);
  } catch (error) {
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
    res.status(204).send(); 
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.warn(error.message);
      return res.status(404).json({ message: error.message });
    }
    logger.error(error, "Error al eliminar el servicio");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};