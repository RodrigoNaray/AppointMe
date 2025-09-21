// backend/src/modules/availability/availability.public.service.ts

import prisma from '../../../config/prisma';
import { WeeklySchedule } from './availability.public.types';
import { addMinutes, format, startOfDay, endOfDay, parse } from 'date-fns';
import { hasTimeConflictOptimized, TimePeriod } from '../../../utils/timeConflictUtils';

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
  const busyPeriods: TimePeriod[] = [
    ...bookings.map(b => ({ start: b.bookingTime, end: addMinutes(b.bookingTime, service.durationMinutes) })),
    ...blocks.map(b => ({ start: b.startTime, end: b.endTime }))
  ];

  // 4. Generar los slots potenciales y filtrarlos de manera optimizada
  const availableSlots: string[] = [];
  const workingHoursStart = parse(daySchedule.start, 'HH:mm', date);
  const workingHoursEnd = parse(daySchedule.end, 'HH:mm', date);
  
  let currentSlotStart = workingHoursStart;
  const slotInterval = 15;

  // Generar todos los slots candidatos primero
  const candidateSlots: TimePeriod[] = [];
  while (addMinutes(currentSlotStart, service.durationMinutes) <= workingHoursEnd) {
    const currentSlotEnd = addMinutes(currentSlotStart, service.durationMinutes);
    candidateSlots.push({
      start: new Date(currentSlotStart),
      end: new Date(currentSlotEnd)
    });
    currentSlotStart = addMinutes(currentSlotStart, slotInterval);
  }

  // Filtrar slots usando búsqueda optimizada O(m log n) donde m = slots, n = ocupaciones
  for (const slot of candidateSlots) {
    const hasConflict = hasTimeConflictOptimized(slot.start, slot.end, busyPeriods);
    if (!hasConflict) {
      availableSlots.push(format(slot.start, 'HH:mm'));
    }
  }

  return availableSlots;
};