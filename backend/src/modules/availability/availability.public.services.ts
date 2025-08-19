// backend/src/modules/availability/availability.public.service.ts

import prisma from '../../config/prisma';
import { WeeklySchedule } from './availability.public.types';
import { addMinutes, format, startOfDay, endOfDay, parse } from 'date-fns';

// Mapeo de los días de la semana de JavaScript (0=Domingo) a nuestros strings
const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const getAvailableSlots = async (serviceId: string, date: Date) => {
  // 1. Obtener toda la información necesaria en paralelo
  const [service, adminUser, bookings, blocks] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    prisma.adminUser.findFirst(),
    prisma.booking.findMany({ where: { bookingTime: { gte: startOfDay(date), lte: endOfDay(date) } } }),
    prisma.availabilityBlock.findMany({ where: { startTime: { lte: endOfDay(date) }, endTime: { gte: startOfDay(date) } } })
  ]);

  if (!service || !adminUser || !adminUser.schedule) {
    return [];
  }

  // --- INICIO DE LA CORRECCIÓN ---
  // 2. Determinamos el día de la semana usando UTC explícitamente.
  //    date.getUTCDay() devuelve un número (0 para Domingo, 1 para Lunes, etc.)
  const dayOfWeekIndex = date.getUTCDay();
  const dayOfWeek = dayMap[dayOfWeekIndex];
  // --- FIN DE LA CORRECCIÓN ---

  const schedule = adminUser.schedule as unknown as WeeklySchedule;
  const daySchedule = schedule[dayOfWeek];

  if (!daySchedule || !daySchedule.isActive) {
    return [];
  }

  // 3. Crear una lista de todos los periodos "ocupados" del día
  const busyPeriods = [
    ...bookings.map(b => ({ start: b.bookingTime, end: addMinutes(b.bookingTime, service.durationMinutes) })),
    ...blocks.map(b => ({ start: b.startTime, end: b.endTime }))
  ];

  // 4. Generar los slots potenciales y filtrarlos
  const availableSlots: string[] = [];
  const workingHoursStart = parse(daySchedule.start, 'HH:mm', date);
  const workingHoursEnd = parse(daySchedule.end, 'HH:mm', date);
  
  let currentSlotStart = workingHoursStart;
  const slotInterval = 15;

  while (addMinutes(currentSlotStart, service.durationMinutes) <= workingHoursEnd) {
    const currentSlotEnd = addMinutes(currentSlotStart, service.durationMinutes);

    const isOverlapping = busyPeriods.some(busyPeriod => 
      (currentSlotStart < busyPeriod.end && currentSlotEnd > busyPeriod.start)
    );

    if (!isOverlapping) {
      availableSlots.push(format(currentSlotStart, 'HH:mm'));
    }

    currentSlotStart = addMinutes(currentSlotStart, slotInterval);
  }

  return availableSlots;
};