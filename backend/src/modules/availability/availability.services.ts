import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { UpdateScheduleDto, WeeklySchedule } from './availability.types';
import logger from '../../utils/logger';

export const getSchedule = async (userId: string): Promise<WeeklySchedule> => {
  const user = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: { schedule: true },
  });

  return (user?.schedule || {}) as unknown as WeeklySchedule;
};

export const updateSchedule = async (userId: string, schedule: UpdateScheduleDto): Promise<WeeklySchedule> => {
  const updatedUser = await prisma.adminUser.update({
    where: { id: userId },
    data: {
      schedule: schedule as unknown as Prisma.InputJsonValue,
    },
    select: { schedule: true },
  });

  return updatedUser.schedule as unknown as WeeklySchedule;
};


export const getBlocks = async () => {
  return prisma.availabilityBlock.findMany({
    orderBy: {
      startTime: 'asc', 
    },
  });
};

export const createBlock = async (data: { startTime: Date; endTime: Date; reason?: string }) => {
  const newBlock = await prisma.availabilityBlock.create({
    data: {
      startTime: data.startTime,
      endTime: data.endTime,
      reason: data.reason,
    },
  });
  logger.info({ blockId: newBlock.id }, "Nuevo bloqueo de tiempo creado");
  return newBlock;
};

export const deleteBlock = async (blockId: string) => {
  await prisma.availabilityBlock.delete({
    where: { id: blockId },
  });
  logger.info({ blockId }, "Bloqueo de tiempo eliminado");
};