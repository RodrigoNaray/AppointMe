import { Request, Response } from 'express';
import { AdminUser } from '@prisma/client';
import * as service from './availability.admin.services';
import { UpdateScheduleDto } from './availability.admin.types';
import logger from '../../../utils/logger';

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
    logger.error(error, "Error al actualizar el horario");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};


export const getBlocksController = async (req: Request, res: Response) => {
  try {
    const blocks = await service.getBlocks();
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
    
    const newBlock = await service.createBlock({
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      reason,
      adminId,
    });
    res.status(201).json(newBlock);
  } catch (error) {
    logger.error(error, "Error al crear el bloqueo de tiempo");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteBlockController = async (req: Request, res: Response) => {
  try {
    await service.deleteBlock(req.params.id);
    res.status(204).send();
  } catch (error) {
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

  try {
    const monthDate = new Date(month + 'T00:00:00');
    const events = await service.getCalendarEvents(userId, monthDate);
    res.status(200).json(events);
  } catch (error) {
    logger.error(error, "Error al generar los eventos del calendario");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};