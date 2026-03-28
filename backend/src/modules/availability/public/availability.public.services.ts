import prisma from '../../../config/prisma';
import { WeeklySchedule } from './availability.public.types';
import { addMinutes } from 'date-fns';
import { hasTimeConflictOptimized, TimePeriod } from '../../../utils/timeConflictUtils';

const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SLOT_INTERVAL_MINUTES = 15;

const getUtcDayRange = (date: Date): { start: Date; endExclusive: Date } => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const endExclusive = new Date(start);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { start, endExclusive };
};

const formatUtcDate = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatUtcMonth = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};


export const getAvailableSlots = async (date: Date, durationMinutes: number) => {
  if (durationMinutes <= 0) {
    return [];
  }

  const { start: dayStartUTC, endExclusive: dayEndUTCExclusive } = getUtcDayRange(date);

  const adminUser = await prisma.adminUser.findFirst({
    select: {
      id: true,
      schedule: true
    }
  });

  if (!adminUser?.id || !adminUser.schedule) {
    return [];
  }

  // 1. Obtener toda la información necesaria en paralelo
  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({ 
      where: {
        adminId: adminUser.id,
        bookingTime: { gte: dayStartUTC, lt: dayEndUTCExclusive },
        status: 'CONFIRMED'
      },
      select: { bookingTime: true, durationMinutes: true } // Snapshot de duración en booking
    }),
    prisma.availabilityBlock.findMany({ 
      where: {
        adminId: adminUser.id,
        startTime: { lt: dayEndUTCExclusive }, 
        endTime: { gte: dayStartUTC } 
      } 
    })
  ]);

  const scopedBookings = bookings;
  const scopedBlocks = blocks;

  // 2. Determinamos el día de la semana usando UTC explícitamente
  const dayOfWeekIndex = date.getUTCDay();
  const dayOfWeek = dayMap[dayOfWeekIndex];

  const schedule = adminUser.schedule as unknown as WeeklySchedule;
  const daySchedule = schedule[dayOfWeek];

  if (!daySchedule || !daySchedule.isActive) {
    return [];
  }

  // 3. Crear una lista de todos los periodos "ocupados" del día
  // CRÍTICO: Usar durationMinutes snapshot del booking (capturado al momento de reservar)
  const busyPeriods: TimePeriod[] = [
    ...scopedBookings.map(b => ({ 
      start: b.bookingTime, 
      end: addMinutes(b.bookingTime, b.durationMinutes) // Snapshot de duración en booking
    })),
    ...scopedBlocks.map(b => ({ start: b.startTime, end: b.endTime }))
  ];



  // 4. Generar los slots potenciales y filtrarlos de manera optimizada
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
    
    currentSlotStart.setUTCMinutes(currentSlotStart.getUTCMinutes() + SLOT_INTERVAL_MINUTES);
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
  if (totalDuration <= 0) {
    return [];
  }

  // 1. Obtener rango del mes en UTC explícitamente
  const monthStart = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1, 0, 0, 0, 0));
  const nextMonthStart = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  
  const adminUser = await prisma.adminUser.findFirst({
    select: {
      id: true,
      schedule: true
    }
  });

  if (!adminUser?.id || !adminUser.schedule) {
    return [];
  }

  // 2. Obtener datos necesarios en paralelo (batch optimization)
  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({ 
      where: {
        adminId: adminUser.id,
        bookingTime: { gte: monthStart, lt: nextMonthStart },
        status: 'CONFIRMED'
      },
      select: { bookingTime: true, durationMinutes: true } // Snapshot de duración en booking
    }),
    prisma.availabilityBlock.findMany({ 
      where: {
        adminId: adminUser.id,
        startTime: { lt: nextMonthStart },
        endTime: { gte: monthStart }
      } 
    })
  ]);

  const schedule = adminUser.schedule as unknown as WeeklySchedule;
  const availableDays: string[] = [];

  // 3. Iterar cada día del mes (generar manualmente en UTC para evitar conversiones)
  const daysInMonth: Date[] = [];
  const currentDay = new Date(monthStart);
  while (currentDay < nextMonthStart) {
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
    const { start: dayStartUTC, endExclusive: dayEndUTCExclusive } = getUtcDayRange(day);
    
    const busyPeriods: TimePeriod[] = [
      ...bookings
        .filter(b => b.bookingTime >= dayStartUTC && b.bookingTime < dayEndUTCExclusive)
        .map(b => ({ 
          start: b.bookingTime, 
          end: addMinutes(b.bookingTime, b.durationMinutes) // Snapshot de duración en booking
        })),
      ...blocks
        .filter(b => b.startTime < dayEndUTCExclusive && b.endTime >= dayStartUTC)
        .map(b => ({ start: b.startTime, end: b.endTime }))
    ];

    // Buscar al menos UN slot con duración >= totalDuration
    let hasAvailableSlot = false;
    let currentSlotStart = new Date(workingHoursStart);

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
      
      currentSlotStart.setUTCMinutes(currentSlotStart.getUTCMinutes() + SLOT_INTERVAL_MINUTES);
    }

    if (hasAvailableSlot) {
      availableDays.push(formatUtcDate(day));
    }
  }

  return availableDays;
};

export const getFirstMonthAvailable = async (
  totalDuration: number,
  maxMonthsAhead = 12
): Promise<string | null> => {
  if (totalDuration <= 0 || maxMonthsAhead <= 0) {
    return null;
  }

  const now = new Date();
  const currentMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  );

  for (let i = 0; i < maxMonthsAhead; i++) {
    const monthStart = new Date(
      Date.UTC(
        currentMonthStart.getUTCFullYear(),
        currentMonthStart.getUTCMonth() + i,
        1,
        0,
        0,
        0,
        0
      )
    );

    const availableDays = await getMonthAvailability(monthStart, totalDuration);
    if (availableDays.length > 0) {
      return formatUtcMonth(monthStart);
    }
  }

  return null;
};

