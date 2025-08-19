import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { UpdateScheduleDto, WeeklySchedule, CalendarEvent } from './availability.admin.types';
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';
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

export const createBlock = async (data: { startTime: Date; endTime: Date; reason?: string; adminId: string }) => {
  const newBlock = await prisma.availabilityBlock.create({
    data: {
      startTime: data.startTime,
      endTime: data.endTime,
      reason: data.reason,
      adminId: data.adminId
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


export const getCalendarEvents = async (userId: string, month: Date): Promise<CalendarEvent[]> => {
  const startOfMonthDate = startOfMonth(month);
  const endOfMonthDate = endOfMonth(month);

  const [user, bookings, blocks] = await Promise.all([
    prisma.adminUser.findUnique({ where: { id: userId }, select: { schedule: true } }),
          prisma.booking.findMany({ 
        where: { 
          adminId: userId,
          bookingTime: { gte: startOfMonthDate, lte: endOfMonthDate } 
        }, 
        include: { 
          service: true,
          client: true 
        } 
      }),
    prisma.availabilityBlock.findMany({ where: { startTime: { lte: endOfMonthDate }, endTime: { gte: startOfMonthDate } } })
  ]);


  const events: CalendarEvent[] = [];
  const schedule = (user?.schedule || {}) as unknown as WeeklySchedule;

  const daysInMonth = eachDayOfInterval({ start: startOfMonthDate, end: endOfMonthDate });
  daysInMonth.forEach(day => {
    const dayOfWeek = format(day, 'eeee').toLowerCase(); 
    const daySchedule = schedule[dayOfWeek];
    
    if (daySchedule?.isActive) {
      const startDateTime = new Date(day);
      const [startHour, startMinute] = daySchedule.start.split(':').map(Number);
      startDateTime.setHours(startHour, startMinute, 0, 0);

      const endDateTime = new Date(day);
      const [endHour, endMinute] = daySchedule.end.split(':').map(Number);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      events.push({
        title: 'Horario de Trabajo',
        start: startDateTime,
        end: endDateTime,
        type: 'working_hours',
      });
    }
  });

  bookings.forEach(booking => {
    events.push({
      title: `${booking.service.name} - ${booking.client.name}`,
      start: booking.bookingTime,
      end: new Date(booking.bookingTime.getTime() + booking.service.durationMinutes * 60000),
      type: 'booking',
    });
  });

  blocks.forEach(block => {
    events.push({
      title: block.reason || 'Tiempo Bloqueado',
      start: block.startTime,
      end: block.endTime,
      type: 'block',
    });
  });

  return events;
};