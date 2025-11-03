/**
 * Utilidades para manejo de lógica de reservas
 * 
 * Justificación arquitectural:
 * - Lógica reutilizable y testeable
 * - Separación de concerns (business logic separada de UI)
 * - Type-safe con TypeScript
 * 
 * OWASP Compliance:
 * - Validación cliente-side para UX (no para seguridad)
 * - Backend siempre valida server-side
 */

/**
 * Valida si una reserva puede ser cancelada según el tiempo mínimo de anticipación
 * 
 * @param bookingTime - Fecha/hora de la reserva en formato ISO 8601 (UTC)
 * @param minCancellationNoticeMinutes - Tiempo mínimo en minutos antes de la cita
 * @returns Objeto con canCancel y minutesRemaining
 * 
 * Ejemplo:
 * ```
 * const result = canCancelBooking('2025-11-05T14:00:00Z', 120);
 * if (result.canCancel) {
 *   // Mostrar botón cancelar
 * }
 * ```
 */
export function canCancelBooking(
  bookingTime: string,
  minCancellationNoticeMinutes: number
): { canCancel: boolean; minutesRemaining: number; hoursRemaining: number } {
  const now = new Date();
  const bookingDate = new Date(bookingTime);
  
  // Calcular minutos restantes hasta la cita
  const minutesRemaining = Math.floor((bookingDate.getTime() - now.getTime()) / 60000);
  
  // Calcular horas para mostrar al usuario (más legible)
  const hoursRemaining = Math.floor(minutesRemaining / 60);
  
  // Solo se puede cancelar si quedan suficientes minutos
  const canCancel = minutesRemaining >= minCancellationNoticeMinutes;
  
  return {
    canCancel,
    minutesRemaining,
    hoursRemaining
  };
}

/**
 * Formatea el tiempo mínimo de cancelación a texto legible
 * 
 * @param minutes - Minutos de anticipación requeridos
 * @returns String formateado (ej: "2 horas", "30 minutos")
 */
export function formatCancellationNotice(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hora${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hora${hours !== 1 ? 's' : ''} y ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''}`;
}
