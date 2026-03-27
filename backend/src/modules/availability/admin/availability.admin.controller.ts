import { Request, Response } from 'express';
import { AdminUser } from '@prisma/client';
import * as service from './availability.admin.services';
import { UpdateScheduleDto } from './availability.admin.types';
import logger from '../../../utils/logger';

const MONTH_REGEX = /^\d{4}-\d{2}$/;

export const getScheduleController = async (req: Request, res: Response) => {
  const admin = req.user as AdminUser;
  const userId = admin.id; 
  try {
    const schedule = await service.getSchedule(userId);
    res.status(200).json(schedule);
  } catch (error) {
    logger.error(error, "Error al obtener el horario");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateScheduleController = async (req: Request, res: Response) => {
  logger.info({ body: req.body }, "Datos recibidos en updateScheduleController");
  
  const admin = req.user as AdminUser;
  const userId = admin.id;
  const scheduleData: UpdateScheduleDto = req.body;
  try {
    const updatedSchedule = await service.updateSchedule(userId, scheduleData);
    logger.info({ userId }, "Horario de administrador actualizado");
    res.status(200).json(updatedSchedule);
  } catch (error) {
    if (error instanceof service.AvailabilityValidationError) {
      return res.status(400).json({ message: error.message });
    }

    logger.error(error, "Error al actualizar el horario");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};


export const getBlocksController = async (req: Request, res: Response) => {
  try {
    const admin = req.user as AdminUser;
    const blocks = await service.getBlocks(admin.id);
    res.status(200).json(blocks);
  } catch (error) {
    logger.error(error, "Error al obtener los bloqueos de tiempo");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const createBlockController = async (req: Request, res: Response) => {
  try {
    const { startTime, endTime, reason } = req.body;
    const admin = req.user as AdminUser;
    const adminId = admin.id;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'startTime y endTime deben ser fechas válidas.' });
    }

    if (start >= end) {
      return res.status(400).json({ message: 'El bloqueo debe cumplir startTime < endTime.' });
    }
    
    const newBlock = await service.createBlock({
      startTime: start,
      endTime: end,
      reason,
      adminId,
    });
    res.status(201).json(newBlock);
  } catch (error) {
    if (error instanceof service.AvailabilityValidationError) {
      return res.status(400).json({ message: error.message });
    }

    logger.error(error, "Error al crear el bloqueo de tiempo");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteBlockController = async (req: Request, res: Response) => {
  try {
    const admin = req.user as AdminUser;
    await service.deleteBlock(req.params.id, admin.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof service.AvailabilityValidationError) {
      return res.status(404).json({ message: error.message });
    }

    logger.error(error, "Error al eliminar el bloqueo de tiempo");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getCalendarEventsController = async (req: Request, res: Response) => {
  const admin = req.user as AdminUser;
  const userId = admin.id;
  const { month } = req.query;

  if (!month || typeof month !== 'string') {
    return res.status(400).json({ message: 'El parámetro "month" es requerido.' });
  }

  if (!MONTH_REGEX.test(month)) {
    return res.status(400).json({ message: 'El parámetro "month" debe tener formato YYYY-MM.' });
  }

  try {
    const monthDate = new Date(`${month}-01T00:00:00.000Z`);

    if (isNaN(monthDate.getTime())) {
      return res.status(400).json({ message: 'El parámetro "month" es inválido.' });
    }

    const events = await service.getCalendarEvents(userId, monthDate);
    res.status(200).json(events);
  } catch (error) {
    logger.error(error, "Error al generar los eventos del calendario");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};