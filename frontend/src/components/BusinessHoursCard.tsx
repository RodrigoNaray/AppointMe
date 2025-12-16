import { memo, useMemo } from 'react';
import { Clock } from 'lucide-react';
import type { BusinessHours, DaySchedule } from '@/api/modules/settings';

interface BusinessHoursCardProps {
  businessHours?: BusinessHours;
  isLoading?: boolean;
}

/**
 * Comparador personalizado para React.memo
 * Solo re-renderiza si businessHours o isLoading cambian REALMENTE
 * 
 * Justificación React Best Practices (2025):
 * - Comparación profunda de objetos complejos (BusinessHours tiene 7 días)
 * - Evita re-renders cuando props son nuevas referencias pero mismo contenido
 * - Performance: reduce conversiones UTC→Local innecesarias
 * 
 * Justificación OWASP A04:2021 (Insecure Design):
 * - Reduce carga computacional innecesaria
 * - Previene DoS por re-renders excesivos
 */
function arePropsEqual(
  prevProps: BusinessHoursCardProps,
  nextProps: BusinessHoursCardProps
): boolean {
  // Si isLoading cambió, re-renderizar
  if (prevProps.isLoading !== nextProps.isLoading) {
    return false;
  }

  // Si ambos son undefined/null, no re-renderizar
  if (!prevProps.businessHours && !nextProps.businessHours) {
    return true;
  }

  // Si uno es undefined y el otro no, re-renderizar
  if (!prevProps.businessHours || !nextProps.businessHours) {
    return false;
  }

  // Comparación profunda de cada día (lunes-domingo)
  const days: Array<keyof BusinessHours> = [
    'monday', 'tuesday', 'wednesday', 'thursday', 
    'friday', 'saturday', 'sunday'
  ];

  return days.every((day) => {
    const prev = prevProps.businessHours![day];
    const next = nextProps.businessHours![day];

    return (
      prev.isOpen === next.isOpen &&
      prev.openTime === next.openTime &&
      prev.closeTime === next.closeTime
    );
  });
}

/**
 * Convierte hora UTC "HH:mm" a hora local del navegador
 * Backend almacena en UTC, UI muestra en hora local
 * @param timeUTC - Hora en formato "HH:mm" UTC (ej: "12:00" = 12:00 UTC)
 * @returns Hora en formato "HH:mm" local (ej: "09:00" para UTC-3)
 * 
 * Justificación ARQUITECTURA TIMEZONE:
 * - Backend: solo UTC (single source of truth)
 * - Frontend: conversión en display layer (no en store)
 * - Mismo patrón que AvailabilityPage.tsx
 * 
 * Edge cases manejados:
 * - Formato inválido: throw error (manejado por formatTime caller)
 * - Horas 00:00 y 23:59: funcionan correctamente
 * - Cambio de día por timezone (23:00 UTC → 01:00 local+1): OK (solo mostramos hora)
 * - Null/undefined: manejado por formatTime antes de llamar esta función
 * 
 * @example
 * // Cliente en UTC-5 (México/CDT)
 * convertTimeUTCToLocal("14:00") // "09:00" ✓
 * convertTimeUTCToLocal("00:00") // "19:00" (día anterior) ✓
 * convertTimeUTCToLocal("23:59") // "18:59" ✓
 */
function convertTimeUTCToLocal(timeUTC: string): string {
  // Validación de entrada (defensive programming)
  if (!timeUTC || typeof timeUTC !== 'string') {
    throw new Error(`timeUTC debe ser string no vacío, recibido: ${typeof timeUTC}`);
  }

  // Parse "HH:mm" con validación estricta
  const parts = timeUTC.split(':');
  if (parts.length !== 2) {
    throw new Error(`Formato inválido: esperado "HH:mm", recibido "${timeUTC}"`);
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  // Validar rangos numéricos
  if (isNaN(hours) || hours < 0 || hours > 23) {
    throw new Error(`Horas inválidas: ${hours} (debe ser 0-23)`);
  }
  if (isNaN(minutes) || minutes < 0 || minutes > 59) {
    throw new Error(`Minutos inválidos: ${minutes} (debe ser 0-59)`);
  }
  
  // Crear fecha arbitraria en UTC con la hora especificada
  // Date.UTC(year, monthIndex, day, hours, minutes, seconds, milliseconds)
  const utcDate = new Date(Date.UTC(2000, 0, 1, hours, minutes, 0, 0));
  
  // Convertir a hora local del navegador
  // JavaScript aplica automáticamente el offset de timezone
  const localHours = utcDate.getHours();
  const localMinutes = utcDate.getMinutes();
  
  return `${String(localHours).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}`;
}

/**
 * BusinessHoursCard - Componente para mostrar horarios de apertura
 * 
 * Features:
 * - Punto verde/gris según estado (abierto/cerrado)
 * - Horarios en formato legible convertidos a timezone local
 * - Validación exhaustiva de datos (defensive programming)
 * - Skeleton loading state
 * - Responsive design
 * 
 * Justificación UX (Gestalt Principles):
 * - Color coding: Verde = abierto, Gris = cerrado (reconocimiento inmediato)
 * - Proximity: Día + horario agrupados visualmente
 * - Consistency: Mismo formato que resto de HomePage cards
 * 
 * Justificación Accessibility (WCAG 2.1):
 * - aria-label en badges describe estado
 * - Color + texto (no solo color para info)
 * - Contraste mínimo 4.5:1
 * 
 * Justificación Code Quality:
 * - Defensive programming: valida todos los datos antes de renderizar
 * - Type safety: TypeScript strict mode compatible
 * - DRY: formatTime reutilizable, renderDayRow consistente
 * - Performance: React.memo con comparación profunda previene re-renders innecesarios
 */
function BusinessHoursCard({ businessHours, isLoading }: BusinessHoursCardProps) {
  // Mapeo de días en español (orden correcto Lunes-Domingo)
  // IMPORTANTE: Este orden debe matchear BusinessHours type
  const daysMap: Record<keyof BusinessHours, string> = useMemo(() => ({
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  }), []); // Nunca cambia, memoizar para evitar recrear objeto

  /**
   * Valida y formatea horario con conversión UTC → Local
   * Defensive programming: maneja casos edge (undefined, formato inválido)
   */
  const formatTime = (time: string | undefined): string => {
    if (!time || typeof time !== 'string') {
      return '00:00';
    }

    // Validar formato HH:mm
    if (!/^\d{2}:\d{2}$/.test(time)) {
      console.warn(`Formato de hora inválido: ${time}`);
      return '00:00';
    }

    try {
      return convertTimeUTCToLocal(time);
    } catch (error) {
      console.error(`Error convirtiendo hora ${time}:`, error);
      return time; // Fallback: mostrar hora original sin conversión
    }
  };

  /**
   * Valida DaySchedule con defensive programming
   * Asegura que siempre tengamos datos válidos para renderizar
   */
  const validateDaySchedule = (schedule: DaySchedule | undefined): DaySchedule => {
    if (!schedule) {
      return { isOpen: false, openTime: '00:00', closeTime: '00:00' };
    }

    return {
      isOpen: Boolean(schedule.isOpen), // Coerce a boolean
      openTime: schedule.openTime || '00:00',
      closeTime: schedule.closeTime || '00:00'
    };
  };

  /**
   * Renderiza fila de un día con validación completa
   */
  const renderDayRow = (dayKey: keyof BusinessHours, dayName: string, scheduleRaw: DaySchedule | undefined) => {
    // Validar datos antes de renderizar
    const schedule = validateDaySchedule(scheduleRaw);
    
    // Determinar color del punto (verde solo si está EXPLÍCITAMENTE abierto)
    const isOpen = schedule.isOpen === true;
    const statusColor = isOpen ? 'bg-green-500' : 'bg-gray-400';
    const statusLabel = isOpen ? 'Abierto' : 'Cerrado';

    return (
      <div key={dayKey} className="flex justify-between items-center" data-testid={`day-row-${dayKey}`}>
        <div className="flex items-center gap-2">
          {/* Punto de estado con validación explícita */}
          <span
            className={`w-2 h-2 rounded-full ${statusColor}`}
            aria-label={statusLabel}
            role="status"
            data-testid={`status-indicator-${dayKey}`}
          />
          <span className="text-sm text-foreground/70 sm:text-base">{dayName}</span>
        </div>
        
        <span className="font-medium text-foreground text-sm sm:text-base" data-testid={`hours-${dayKey}`}>
          {isOpen 
            ? `${formatTime(schedule.openTime)} - ${formatTime(schedule.closeTime)}`
            : 'Cerrado'
          }
        </span>
      </div>
    );
  };

  // Loading skeleton
  if (isLoading || !businessHours) {
    return (
      <div className="rounded-2xl border border-border bg-background p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-foreground/5 p-2">
            <Clock className="h-5 w-5 text-foreground sm:h-6 sm:w-6" />
          </div>
          <h4 className="text-lg font-semibold text-foreground sm:text-xl">Horarios</h4>
        </div>
        <div className="space-y-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex justify-between animate-pulse">
              <div className="h-5 bg-foreground/10 rounded w-20"></div>
              <div className="h-5 bg-foreground/10 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-foreground/5 p-2">
          <Clock className="h-5 w-5 text-foreground sm:h-6 sm:w-6" />
        </div>
        <h4 className="text-lg font-semibold text-foreground sm:text-xl">Horarios</h4>
      </div>
      <div className="space-y-2">
        {(Object.keys(daysMap) as Array<keyof BusinessHours>).map((dayKey) =>
          renderDayRow(dayKey, daysMap[dayKey], businessHours[dayKey])
        )}
      </div>
    </div>
  );
}

/**
 * Export componente memoizado
 * React.memo con comparación personalizada previene re-renders cuando:
 * - Parent component re-renderiza pero props no cambiaron
 * - businessHours es nueva referencia pero mismo contenido
 * 
 * Justificación React Best Practices:
 * - Componente "puro" (output depende solo de props)
 * - Cálculos pesados (7 días × conversiones UTC→Local)
 * - Props complejas (objeto con 7 nested objects)
 */
export default memo(BusinessHoursCard, arePropsEqual);
