import { Request, Response } from 'express';
import * as publicService from './availability.public.services';
import logger from '../../utils/logger';

export const getAvailableSlotsController = async (req: Request, res: Response) => {
  const { serviceId, date } = req.query;
  if (!serviceId || !date || typeof serviceId !== 'string' || typeof date !== 'string') {
    return res.status(400).json({ message: 'Los parámetros "serviceId" y "date" son requeridos.' });
  }
  try {
    const utcDate = new Date(date);
    const slots = await publicService.getAvailableSlots(serviceId, utcDate);
    res.status(200).json(slots);
  } catch (error) {
    logger.error(error, "Error al calcular los slots de disponibilidad");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};