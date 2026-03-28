import { Request, Response } from 'express';
import * as availabilityPublicService from './availability.public.services';
import logger from '../../../utils/logger';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-\d{2}$/;


export const getAvailableSlotsController = async (req: Request, res: Response) => {
  const { durationMinutes, date } = req.query;
  
  if (!durationMinutes || !date || typeof durationMinutes !== 'string' || typeof date !== 'string') {
    return res.status(400).json({ message: 'Los parámetros "durationMinutes" y "date" son requeridos.' });
  }
  
  const duration = parseInt(durationMinutes, 10);
  if (isNaN(duration) || duration <= 0) {
    return res.status(400).json({ message: 'El parámetro "durationMinutes" debe ser un número positivo.' });
  }

  if (!DATE_REGEX.test(date)) {
    return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
  }
  
  try {
    // Parsear fecha como medianoche UTC explícitamente
    // date = "2025-10-29" debe ser 2025-10-29T00:00:00.000Z
    const utcDate = new Date(`${date}T00:00:00.000Z`);
    
    if (isNaN(utcDate.getTime())) {
      return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
    }
    
    const slots = await availabilityPublicService.getAvailableSlots(utcDate, duration);
    res.status(200).json(slots);
  } catch (error) {
    logger.error(error, "Error al calcular los slots de disponibilidad");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getMonthAvailabilityController = async (req: Request, res: Response) => {
  const { month, totalDuration } = req.query;

  // Validación de parámetros
  if (!month || !totalDuration || typeof month !== 'string' || typeof totalDuration !== 'string') {
    return res.status(400).json({ 
      message: 'Los parámetros "month" (YYYY-MM) y "totalDuration" (minutos) son requeridos.' 
    });
  }

  const duration = parseInt(totalDuration, 10);
  if (isNaN(duration) || duration <= 0) {
    return res.status(400).json({ 
      message: 'El parámetro "totalDuration" debe ser un número mayor a 0.' 
    });
  }

  if (!MONTH_REGEX.test(month)) {
    return res.status(400).json({ 
      message: 'El parámetro "month" debe tener formato YYYY-MM.' 
    });
  }

  try {
    // Parsear month como primer día del mes en UTC explícitamente
    // month = "2025-10" debe ser 2025-10-01T00:00:00.000Z
    const monthDate = new Date(`${month}-01T00:00:00.000Z`);
    
    if (isNaN(monthDate.getTime())) {
      return res.status(400).json({ 
        message: 'El parámetro "month" debe tener formato YYYY-MM.' 
      });
    }

    const availableDays: string[] = await availabilityPublicService.getMonthAvailability(monthDate, duration);
    res.status(200).json(availableDays);
  } catch (error) {
    logger.error(error, "Error al calcular disponibilidad mensual");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getFirstMonthAvailable = async (req: Request, res: Response) => {
  const { totalDuration, maxMonthsAhead } = req.body as {
    totalDuration?: unknown;
    maxMonthsAhead?: unknown;
  };

  if (!Number.isInteger(totalDuration) || Number(totalDuration) <= 0) {
    return res.status(400).json({
      message: 'El parámetro "totalDuration" debe ser un entero mayor a 0.'
    });
  }

  if (
    maxMonthsAhead !== undefined &&
    (!Number.isInteger(maxMonthsAhead) || Number(maxMonthsAhead) <= 0)
  ) {
    return res.status(400).json({
      message: 'El parámetro "maxMonthsAhead" debe ser un entero mayor a 0.'
    });
  }

  const parsedTotalDuration = Number(totalDuration);
  const parsedMaxMonthsAhead =
    maxMonthsAhead === undefined ? undefined : Number(maxMonthsAhead);

  try {
    const month = await availabilityPublicService.getFirstMonthAvailable(
      parsedTotalDuration,
      parsedMaxMonthsAhead
    );
    return res.status(200).json({ month });
  } catch (error) {
    logger.error(error, 'Error al calcular el primer mes disponible');
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};