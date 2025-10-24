import { Request, Response } from 'express';
import * as publicService from './availability.public.services';
import logger from '../../../utils/logger';
import { parse } from 'date-fns';

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

/**
 * getMonthAvailabilityController - Endpoint para obtener días disponibles del mes
 * 
 * Query params:
 * - month: YYYY-MM (ej: "2025-10")
 * - totalDuration: número de minutos requeridos (ej: 90)
 * 
 * Response: string[] de fechas YYYY-MM-DD con disponibilidad
 * 
 * Mejores prácticas:
 * - OWASP: Validación de input (month format, totalDuration > 0)
 * - Error handling con logger (Pino)
 * - Status codes HTTP semánticos (400, 500)
 */
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

  try {
    // Parsear month (YYYY-MM) a Date usando date-fns para evitar problemas de timezone
    // parse('2025-10', 'yyyy-MM', new Date()) crea el 1 de octubre 2025 en zona local
    const monthDate = parse(`${month}-01`, 'yyyy-MM-dd', new Date());
    
    if (isNaN(monthDate.getTime())) {
      return res.status(400).json({ 
        message: 'El parámetro "month" debe tener formato YYYY-MM.' 
      });
    }

    const availableDays = await publicService.getMonthAvailability(monthDate, duration);
    res.status(200).json(availableDays);
  } catch (error) {
    logger.error(error, "Error al calcular disponibilidad mensual");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};