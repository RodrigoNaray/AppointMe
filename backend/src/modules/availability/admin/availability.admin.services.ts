import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma';
import { UpdateScheduleDto, WeeklySchedule, CalendarEvent } from './availability.admin.types';
import { addMinutes } from 'date-fns';
import logger from '../../../utils/logger';

const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class AvailabilityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AvailabilityValidationError';
  }
}

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
};

const validateSchedulePayload = (schedule: UpdateScheduleDto): void => {
  for (const [day, daySchedule] of Object.entries(schedule)) {
    if (!dayMap.includes(day)) {
      throw new AvailabilityValidationError(`Día inválido en schedule: ${day}.`);
    }

    if (!daySchedule || typeof daySchedule !== 'object') {
      throw new AvailabilityValidationError(`Configuración inválida para el día ${day}.`);
    }

    const { start, end, isActive } = daySchedule;

    if (typeof isActive !== 'boolean' || typeof start !== 'string' || typeof end !== 'string') {
      throw new AvailabilityValidationError(`Formato inválido para el día ${day}.`);
    }

    if (!TIME_REGEX.test(start) || !TIME_REGEX.test(end)) {
      throw new AvailabilityValidationError(`Formato de hora inválido en ${day}. Use HH:mm.`);
    }

    if (toMinutes(start) >= toMinutes(end)) {
      throw new AvailabilityValidationError(`El rango horario en ${day} debe cumplir start < end.`);
    }
  }
};

export const getSchedule = async (userId: string): Promise<WeeklySchedule> => {
  const user = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: { schedule: true },
  });

  return (user?.schedule || {}) as unknown as WeeklySchedule;
};

export const updateSchedule = async (userId: string, schedule: UpdateScheduleDto): Promise<WeeklySchedule> => {
  validateSchedulePayload(schedule);

  const updatedUser = await prisma.adminUser.update({
    where: { id: userId },
    data: {
      schedule: schedule as unknown as Prisma.InputJsonValue,
    },
    select: { schedule: true },
  });

  return updatedUser.schedule as unknown as WeeklySchedule;
};


export const getBlocks = async (adminId: string) => {
  return prisma.availabilityBlock.findMany({
    where: {
      adminId
    },
    orderBy: {
      startTime: 'asc', 
    },
  });
};

export const createBlock = async (data: { startTime: Date; endTime: Date; reason?: string; adminId: string }) => {
  if (isNaN(data.startTime.getTime()) || isNaN(data.endTime.getTime())) {
    throw new AvailabilityValidationError('Las fechas de bloqueo son inválidas.');
  }

  if (data.startTime >= data.endTime) {
    throw new AvailabilityValidationError('El bloqueo debe cumplir startTime < endTime.');
  }

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

export const deleteBlock = async (blockId: string, adminId: string) => {
  const deleted = await prisma.availabilityBlock.deleteMany({
    where: { id: blockId, adminId },
  });

  if (deleted.count === 0) {
    throw new AvailabilityValidationError('Bloqueo no encontrado.');
  }

  logger.info({ blockId }, "Bloqueo de tiempo eliminado");
};

export const updateBlock = async (blockId: string, adminId: string, data: { startTime: Date; endTime: Date; reason?: string }) => {
  if (isNaN(data.startTime.getTime()) || isNaN(data.endTime.getTime())) {
    throw new AvailabilityValidationError('Las fechas de bloqueo son inválidas.');
  }

  if (data.startTime >= data.endTime) {
    throw new AvailabilityValidationError('El bloqueo debe cumplir startTime < endTime.');
  }

  const existing = await prisma.availabilityBlock.findFirst({
    where: { id: blockId, adminId },
  });

  if (!existing) {
    throw new AvailabilityValidationError('Bloqueo no encontrado.');
  }

  const updated = await prisma.availabilityBlock.update({
    where: { id: blockId },
    data: {
      startTime: data.startTime,
      endTime: data.endTime,
      reason: data.reason ?? existing.reason,
    },
  });

  logger.info({ blockId }, "Bloqueo de tiempo actualizado");
  return updated;
};


export const getCalendarEvents = async (userId: string, month: Date): Promise<CalendarEvent[]> => {
  const startOfMonthDate = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1, 0, 0, 0, 0));
  const nextMonthStart = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1, 0, 0, 0, 0));

  const [user, bookings, blocks] = await Promise.all([
    prisma.adminUser.findUnique({ where: { id: userId }, select: { schedule: true } }),
    prisma.booking.findMany({
      where: {
        adminId: userId,
        status: 'CONFIRMED',
        bookingTime: { gte: startOfMonthDate, lt: nextMonthStart }
      },
      include: {
        service: true,
        client: true
      }
    }),
    prisma.availabilityBlock.findMany({
      where: {
        adminId: userId,
        startTime: { lt: nextMonthStart },
        endTime: { gte: startOfMonthDate }
      }
    })
  ]);


  const events: CalendarEvent[] = [];
  const schedule = (user?.schedule || {}) as unknown as WeeklySchedule;

  const daysInMonth: Date[] = [];
  const day = new Date(startOfMonthDate);
  while (day < nextMonthStart) {
    daysInMonth.push(new Date(day));
    day.setUTCDate(day.getUTCDate() + 1);
  }

  daysInMonth.forEach(day => {
    const dayOfWeek = dayMap[day.getUTCDay()];
    const daySchedule = schedule[dayOfWeek];
    
    if (daySchedule?.isActive) {
      const startDateTime = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0));
      const [startHour, startMinute] = daySchedule.start.split(':').map(Number);
      startDateTime.setUTCHours(startHour, startMinute, 0, 0);

      const endDateTime = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0));
      const [endHour, endMinute] = daySchedule.end.split(':').map(Number);
      endDateTime.setUTCHours(endHour, endMinute, 0, 0);

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
      id: booking.id,
      title: `${booking.service.name} - ${booking.client.name}`,
      start: booking.bookingTime,
      end: addMinutes(booking.bookingTime, booking.durationMinutes),
      type: 'booking',
      clientName: booking.client.name,
      serviceName: booking.service.name,
      durationMinutes: booking.durationMinutes,
      status: booking.status,
    });
  });

  blocks.forEach(block => {
    events.push({
      id: block.id,
      title: block.reason || 'Tiempo Bloqueado',
      start: block.startTime,
      end: block.endTime,
      type: 'block',
    });
  });

  return events;
};