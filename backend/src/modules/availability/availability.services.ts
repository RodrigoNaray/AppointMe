import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { UpdateScheduleDto, WeeklySchedule } from './availability.types';

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