import { Request, Response } from 'express';
import { AdminUser } from '@prisma/client';
import * as service from './category.services';
import { CreateCategoryDto, UpdateCategoryDto } from './category.types';
import { ConflictError, NotFoundError, BadRequestError } from '../../utils/error';
import logger from '../../utils/logger';

/**
 * GET /api/categories - Obtiene categorías públicas (sin auth)
 * Solo categorías activas con servicios activos
 */
export const findAllPublic = async (req: Request, res: Response) => {
  try {
    const categories = await service.getPublicCategories();
    res.status(200).json(categories);
  } catch (error) {
    logger.error(error, 'Error al obtener categorías públicas');
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/admin/categories - Obtiene todas las categorías (requiere auth admin)
 */
export const findAll = async (req: Request, res: Response) => {
  try {
    const categories = await service.getAllCategories();
    res.status(200).json(categories);
  } catch (error) {
    logger.error(error, 'Error al obtener categorías');
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/admin/categories/:id - Obtiene una categoría por ID
 */
export const findOne = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const category = await service.getCategoryById(req.params.id);
    res.status(200).json(category);
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.warn(error.message);
      return res.status(404).json({ message: error.message });
    }
    logger.error(error, 'Error al obtener la categoría');
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * POST /api/admin/categories - Crea una nueva categoría
 */
export const create = async (req: Request<{}, {}, CreateCategoryDto>, res: Response) => {
  try {
    const newCategory = await service.createCategory(req.body);
    res.status(201).json(newCategory);
  } catch (error) {
    if (error instanceof BadRequestError) {
      logger.warn(error.message);
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof ConflictError) {
      logger.warn(error.message);
      return res.status(409).json({ message: error.message });
    }
    logger.error(error, 'Error al crear categoría');
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * PUT /api/admin/categories/:id - Actualiza una categoría
 */
export const update = async (req: Request<{ id: string }, {}, UpdateCategoryDto>, res: Response) => {
  try {
    const updatedCategory = await service.updateCategory(req.params.id, req.body);
    res.status(200).json(updatedCategory);
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.warn(error.message);
      return res.status(404).json({ message: error.message });
    }
    if (error instanceof BadRequestError) {
      logger.warn(error.message);
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof ConflictError) {
      logger.warn(error.message);
      return res.status(409).json({ message: error.message });
    }
    logger.error(error, 'Error al actualizar categoría');
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * DELETE /api/admin/categories/:id - Elimina una categoría
 */
export const remove = async (req: Request<{ id: string }>, res: Response) => {
  try {
    await service.deleteCategory(req.params.id);
    res.status(204).send(); // 204 No Content
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.warn(error.message);
      return res.status(404).json({ message: error.message });
    }
    if (error instanceof ConflictError) {
      logger.warn(error.message);
      return res.status(409).json({ message: error.message });
    }
    logger.error(error, 'Error al eliminar categoría');
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
