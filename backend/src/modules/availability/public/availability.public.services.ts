import prisma from '../../../config/prisma';
import { WeeklySchedule } from './availability.public.types';
import { addMinutes, format, startOfDay, endOfDay, parse, startOfMonth, endOfMonth, eachDayOfInterval, addDays } from 'date-fns';
import { hasTimeConflictOptimized, TimePeriod } from '../../../utils/timeConflictUtils';

const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];


export const getAvailableSlots = async (date: Date, durationMinutes: number) => {
  // 1. Calcular inicio y fin del día en UTC explícitamente
  const startOfDayUTC = new Date(date);
  startOfDayUTC.setUTCHours(0, 0, 0, 0);
  
  const endOfDayUTC = new Date(date);
  endOfDayUTC.setUTCHours(23, 59, 59, 999);
  
  // 2. Obtener toda la información necesaria en paralelo
  const [adminUser, bookings, blocks] = await Promise.all([
    prisma.adminUser.findFirst(),
    prisma.booking.findMany({ 
      where: { bookingTime: { gte: startOfDayUTC, lte: endOfDayUTC } },
      select: { bookingTime: true, durationMinutes: true } // Snapshot de duración en booking
    }),
    prisma.availabilityBlock.findMany({ 
      where: { 
        startTime: { lte: endOfDayUTC }, 
        endTime: { gte: startOfDayUTC } 
      } 
    })
  ]);

  if (!adminUser || !adminUser.schedule) {
    return [];
  }

  // 3. Determinamos el día de la semana usando UTC explícitamente
  const dayOfWeekIndex = date.getUTCDay();
  const dayOfWeek = dayMap[dayOfWeekIndex];

  const schedule = adminUser.schedule as unknown as WeeklySchedule;
  const daySchedule = schedule[dayOfWeek];

  if (!daySchedule || !daySchedule.isActive) {
    return [];
  }

  // 4. Crear una lista de todos los periodos "ocupados" del día
  // CRÍTICO: Usar durationMinutes snapshot del booking (capturado al momento de reservar)
  const busyPeriods: TimePeriod[] = [
    ...bookings.map(b => ({ 
      start: b.bookingTime, 
      end: addMinutes(b.bookingTime, b.durationMinutes) // Snapshot de duración en booking
    })),
    ...blocks.map(b => ({ start: b.startTime, end: b.endTime }))
  ];



  // 5. Generar los slots potenciales y filtrarlos de manera optimizada
  const availableSlots: string[] = [];
  
  // CRÍTICO: Parsear horarios en UTC explícitamente
  // daySchedule.start/end son strings "HH:mm" (ej: "09:00")
  // Necesitamos convertirlos a Date objects en UTC para el día específico
  const [startHours, startMinutes] = daySchedule.start.split(':').map(Number);
  const [endHours, endMinutes] = daySchedule.end.split(':').map(Number);
  
  const workingHoursStart = new Date(date);
  workingHoursStart.setUTCHours(startHours, startMinutes, 0, 0);
  
  const workingHoursEnd = new Date(date);
  workingHoursEnd.setUTCHours(endHours, endMinutes, 0, 0);
  
  let currentSlotStart = new Date(workingHoursStart);
  const slotInterval = 15;

  // Generar todos los slots candidatos primero usando la duración solicitada
  const candidateSlots: TimePeriod[] = [];
  while (currentSlotStart < workingHoursEnd) {
    const currentSlotEnd = new Date(currentSlotStart);
    currentSlotEnd.setUTCMinutes(currentSlotEnd.getUTCMinutes() + durationMinutes);
    
    // Solo agregar si el slot completo cabe en el horario laboral
    if (currentSlotEnd <= workingHoursEnd) {
      candidateSlots.push({
        start: new Date(currentSlotStart),
        end: currentSlotEnd
      });
    }
    
    currentSlotStart.setUTCMinutes(currentSlotStart.getUTCMinutes() + slotInterval);
  }

  // Filtrar slots usando búsqueda optimizada O(m log n) donde m = slots, n = ocupaciones
  for (const slot of candidateSlots) {
    const hasConflict = hasTimeConflictOptimized(slot.start, slot.end, busyPeriods);
    if (!hasConflict) {
      // Formatear en UTC explícitamente
      const hours = slot.start.getUTCHours().toString().padStart(2, '0');
      const minutes = slot.start.getUTCMinutes().toString().padStart(2, '0');
      availableSlots.push(`${hours}:${minutes}`);
    }
  }

  return availableSlots;
};


export const getMonthAvailability = async (month: Date, totalDuration: number) => {
  // 1. Obtener rango del mes en UTC explícitamente
  const monthStart = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  
  // 2. Obtener datos necesarios en paralelo (batch optimization)
  const [adminUser, bookings, blocks] = await Promise.all([
    prisma.adminUser.findFirst(),
    prisma.booking.findMany({ 
      where: { 
        bookingTime: { gte: monthStart, lte: addDays(monthEnd, 1) } 
      },
      select: { bookingTime: true, durationMinutes: true } // Snapshot de duración en booking
    }),
    prisma.availabilityBlock.findMany({ 
      where: { 
        startTime: { lte: addDays(monthEnd, 1) },
        endTime: { gte: monthStart }
      } 
    })
  ]);

  if (!adminUser || !adminUser.schedule) {
    return [];
  }

  const schedule = adminUser.schedule as unknown as WeeklySchedule;
  const availableDays: string[] = [];

  // 3. Iterar cada día del mes (generar manualmente en UTC para evitar conversiones)
  const daysInMonth: Date[] = [];
  const currentDay = new Date(monthStart);
  while (currentDay <= monthEnd) {
    daysInMonth.push(new Date(currentDay));
    currentDay.setUTCDate(currentDay.getUTCDate() + 1);
  }
  
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  for (const day of daysInMonth) {
    // Saltar días pasados (comparar en UTC)
    if (day < todayUTC) {
      continue;
    }

    // Verificar si el día tiene schedule activo
    const dayOfWeekIndex = day.getUTCDay();
    const dayOfWeek = dayMap[dayOfWeekIndex];
    const daySchedule = schedule[dayOfWeek];

    if (!daySchedule || !daySchedule.isActive) {
      continue;
    }



    // Calcular minutos disponibles en el día (parsear en UTC explícitamente)
    const [startHours, startMinutes] = daySchedule.start.split(':').map(Number);
    const [endHours, endMinutes] = daySchedule.end.split(':').map(Number);
    
    const workingHoursStart = new Date(day);
    workingHoursStart.setUTCHours(startHours, startMinutes, 0, 0);
    
    const workingHoursEnd = new Date(day);
    workingHoursEnd.setUTCHours(endHours, endMinutes, 0, 0);
    
    // Filtrar bookings y blocks de este día (usar UTC explícito)
    const dayStartUTC = new Date(day);
    dayStartUTC.setUTCHours(0, 0, 0, 0);
    
    const dayEndUTC = new Date(day);
    dayEndUTC.setUTCHours(23, 59, 59, 999);
    
    const busyPeriods: TimePeriod[] = [
      ...bookings
        .filter(b => b.bookingTime >= dayStartUTC && b.bookingTime <= dayEndUTC)
        .map(b => ({ 
          start: b.bookingTime, 
          end: addMinutes(b.bookingTime, b.durationMinutes) // Snapshot de duración en booking
        })),
      ...blocks
        .filter(b => b.startTime <= dayEndUTC && b.endTime >= dayStartUTC)
        .map(b => ({ start: b.startTime, end: b.endTime }))
    ];

    // Buscar al menos UN slot con duración >= totalDuration
    let hasAvailableSlot = false;
    let currentSlotStart = new Date(workingHoursStart);
    const slotInterval = 15;

    while (currentSlotStart < workingHoursEnd) {
      const currentSlotEnd = new Date(currentSlotStart);
      currentSlotEnd.setUTCMinutes(currentSlotEnd.getUTCMinutes() + totalDuration);
      
      // Solo verificar si el slot completo cabe en el horario laboral
      if (currentSlotEnd <= workingHoursEnd) {
        const hasConflict = hasTimeConflictOptimized(currentSlotStart, currentSlotEnd, busyPeriods);
        
        if (!hasConflict) {
          hasAvailableSlot = true;
          break; // Encontramos al menos un slot, este día es válido
        }
      }
      
      currentSlotStart.setUTCMinutes(currentSlotStart.getUTCMinutes() + slotInterval);
    }

    if (hasAvailableSlot) {
      // Formatear fecha manualmente en UTC (format() de date-fns convierte a local)
      const year = day.getUTCFullYear();
      const month = String(day.getUTCMonth() + 1).padStart(2, '0');
      const dayNum = String(day.getUTCDate()).padStart(2, '0');
      availableDays.push(`${year}-${month}-${dayNum}`);
    }
  }

  return availableDays;
};

