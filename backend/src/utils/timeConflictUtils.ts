/**
 * Utilidades optimizadas para detección de conflictos temporales
 * Complejidad: O(log n) para detección de conflictos
 */

export interface TimePeriod {
  start: Date;
  end: Date;
}

/**
 * Detecta conflictos entre períodos de tiempo usando búsqueda binaria O(log n)
 * @param requestedStart Inicio del período solicitado
 * @param requestedEnd Fin del período solicitado
 * @param busyPeriods Array de períodos ocupados (será ordenado internamente)
 * @returns true si hay conflicto, false si no
 */
export const hasTimeConflictOptimized = (
  requestedStart: Date, 
  requestedEnd: Date, 
  busyPeriods: TimePeriod[]
): boolean => {
  if (busyPeriods.length === 0) return false;

  // 1. Ordenar períodos por tiempo de inicio - O(n log n) amortizado
  const sortedPeriods = [...busyPeriods].sort((a, b) => a.start.getTime() - b.start.getTime());

  // 1b. Fusionar períodos solapados: el early-break del paso 3 solo es correcto
  // si los períodos ocupados no se solapan entre sí (inicio ordenado => fin ordenado).
  const mergedPeriods: TimePeriod[] = [];
  for (const period of sortedPeriods) {
    const last = mergedPeriods[mergedPeriods.length - 1];
    if (last && period.start <= last.end) {
      if (period.end > last.end) {
        last.end = period.end;
      }
    } else {
      mergedPeriods.push({ start: period.start, end: period.end });
    }
  }

  // 2. Buscar el primer período que podría solaparse usando búsqueda binaria - O(log n)
  let left = 0;
  let right = mergedPeriods.length - 1;
  
  // Encontrar el último período cuyo inicio es <= requestedEnd
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midPeriod = mergedPeriods[mid];
    
    if (midPeriod.start <= requestedEnd) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  // 3. Verificar conflictos desde la posición encontrada hacia atrás - O(log n) en promedio
  // Solo necesitamos verificar períodos que podrían solaparse
  for (let i = right; i >= 0; i--) {
    const period = mergedPeriods[i];
    
    // Si el período termina antes de que empiece el solicitado, no hay más conflictos posibles
    // (porque están ordenados por inicio, los anteriores terminarán aún antes)
    if (period.end <= requestedStart) break;
    
    // Verificar solapamiento: dos períodos se solapan si uno empieza antes de que termine el otro
    if (requestedStart < period.end && requestedEnd > period.start) {
      return true;
    }
  }
  
  return false;
};

/**
 * Función optimizada para verificar múltiples slots contra un conjunto de períodos ocupados
 * Útil para generar slots disponibles de manera eficiente
 * @param candidateSlots Array de períodos candidatos a verificar
 * @param busyPeriods Array de períodos ocupados
 * @returns Array de slots disponibles (sin conflictos)
 */
export const filterAvailableSlots = (
  candidateSlots: TimePeriod[],
  busyPeriods: TimePeriod[]
): TimePeriod[] => {
  if (busyPeriods.length === 0) return candidateSlots;
  if (candidateSlots.length === 0) return [];

  // Ordenar períodos ocupados una sola vez - O(n log n)
  const sortedBusyPeriods = [...busyPeriods].sort((a, b) => a.start.getTime() - b.start.getTime());
  
  // Filtrar slots usando búsqueda optimizada - O(m log n) donde m = slots candidatos, n = períodos ocupados
  return candidateSlots.filter(slot => 
    !hasTimeConflictOptimized(slot.start, slot.end, sortedBusyPeriods)
  );
};

/**
 * Versión no optimizada para comparación y fallback
 * Complejidad: O(n*m) donde n = busyPeriods, m = candidateSlots
 */
export const hasTimeConflictSimple = (
  requestedStart: Date, 
  requestedEnd: Date, 
  busyPeriods: TimePeriod[]
): boolean => {
  return busyPeriods.some(period =>
    requestedStart < period.end && requestedEnd > period.start
  );
};