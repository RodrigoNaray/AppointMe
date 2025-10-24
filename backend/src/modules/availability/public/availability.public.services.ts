// backend/src/modules/availability/availability.public.service.ts

import prisma from '../../../config/prisma';
import { WeeklySchedule } from './availability.public.types';
import { addMinutes, format, startOfDay, endOfDay, parse, startOfMonth, endOfMonth, eachDayOfInterval, addDays } from 'date-fns';
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

/**
 * getMonthAvailability - Obtiene días del mes con disponibilidad suficiente
 * 
 * @param month - Fecha del mes (YYYY-MM-DD o Date)
 * @param totalDuration - Duración total requerida en minutos
 * @returns Array de fechas (YYYY-MM-DD) con disponibilidad >= totalDuration
 * 
 * Mejores prácticas:
 * - Batch query optimization: fetch schedule + bookings + blocks de todo el mes
 * - O(n) complexity: single pass por día
 * - date-fns: eachDayOfInterval para iterar días del mes
 */
export const getMonthAvailability = async (month: Date, totalDuration: number) => {
  console.log('[getMonthAvailability] START - month:', month, 'totalDuration:', totalDuration);
  
  // 1. Obtener rango del mes
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  
  console.log('[getMonthAvailability] Month range:', { monthStart, monthEnd });
  
  // 2. Obtener datos necesarios en paralelo (batch optimization)
  const [adminUser, bookings, blocks] = await Promise.all([
    prisma.adminUser.findFirst(),
    prisma.booking.findMany({ 
      where: { 
        bookingTime: { gte: monthStart, lte: addDays(monthEnd, 1) } 
      } 
    }),
    prisma.availabilityBlock.findMany({ 
      where: { 
        startTime: { lte: addDays(monthEnd, 1) },
        endTime: { gte: monthStart }
      } 
    })
  ]);

  console.log('[getMonthAvailability] DB results:', { 
    hasAdminUser: !!adminUser, 
    hasSchedule: !!adminUser?.schedule,
    bookingsCount: bookings.length,
    blocksCount: blocks.length 
  });

  if (!adminUser || !adminUser.schedule) {
    return [];
  }

  const schedule = adminUser.schedule as unknown as WeeklySchedule;
  console.log('[getMonthAvailability] Schedule:', schedule);
  
  const availableDays: string[] = [];

  // 3. Iterar cada día del mes
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  console.log('[getMonthAvailability] Days in month:', daysInMonth.length);

  const today = startOfDay(new Date());
  console.log('[getMonthAvailability] Today:', today);

  for (const day of daysInMonth) {
    // Saltar días pasados
    if (day < today) {
      console.log('[getMonthAvailability] Skipping past day:', format(day, 'yyyy-MM-dd'));
      continue;
    }

    // Verificar si el día tiene schedule activo
    const dayOfWeekIndex = day.getUTCDay();
    const dayOfWeek = dayMap[dayOfWeekIndex];
    const daySchedule = schedule[dayOfWeek];

    console.log('[getMonthAvailability] Checking day:', format(day, 'yyyy-MM-dd'), 'dayOfWeek:', dayOfWeek, 'schedule:', daySchedule);

    if (!daySchedule || !daySchedule.isActive) {
      console.log('[getMonthAvailability] Day not active or no schedule');
      continue;
    }

    // Calcular minutos disponibles en el día
    const workingHoursStart = parse(daySchedule.start, 'HH:mm', day);
    const workingHoursEnd = parse(daySchedule.end, 'HH:mm', day);
    
    // Filtrar bookings y blocks de este día
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    
    const busyPeriods: TimePeriod[] = [
      ...bookings
        .filter(b => b.bookingTime >= dayStart && b.bookingTime <= dayEnd)
        .map(b => ({ 
          start: b.bookingTime, 
          end: addMinutes(b.bookingTime, totalDuration) // Usar totalDuration del carrito
        })),
      ...blocks
        .filter(b => b.startTime <= dayEnd && b.endTime >= dayStart)
        .map(b => ({ start: b.startTime, end: b.endTime }))
    ];

    // Buscar al menos UN slot con duración >= totalDuration
    let hasAvailableSlot = false;
    let currentSlotStart = workingHoursStart;
    const slotInterval = 15;

    while (addMinutes(currentSlotStart, totalDuration) <= workingHoursEnd) {
      const currentSlotEnd = addMinutes(currentSlotStart, totalDuration);
      const hasConflict = hasTimeConflictOptimized(currentSlotStart, currentSlotEnd, busyPeriods);
      
      if (!hasConflict) {
        hasAvailableSlot = true;
        break; // Encontramos al menos un slot, este día es válido
      }
      
      currentSlotStart = addMinutes(currentSlotStart, slotInterval);
    }

    if (hasAvailableSlot) {
      console.log('[getMonthAvailability] Day has available slot:', format(day, 'yyyy-MM-dd'));
      availableDays.push(format(day, 'yyyy-MM-dd'));
    } else {
      console.log('[getMonthAvailability] Day has NO available slot:', format(day, 'yyyy-MM-dd'));
    }
  }

  console.log('[getMonthAvailability] RESULT - availableDays:', availableDays);
  return availableDays;
};