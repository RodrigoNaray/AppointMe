import { Request, Response } from 'express';
import { AdminUser } from '@prisma/client';
import * as service from './client.admin.services';
import logger from '../../utils/logger';

export const getClientsController = async (req: Request, res: Response) => {
  try {
    const admin = req.user as AdminUser;
    const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;

    if (searchQuery && searchQuery.length < 2) {
      return res.status(400).json({ message: 'La búsqueda debe tener al menos 2 caracteres.' });
    }

    const clients = await service.getClientsForAdmin(admin.id, searchQuery || undefined);
    res.status(200).json(clients);
  } catch (error) {
    logger.error(error, 'Error al obtener clientes del admin');
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
