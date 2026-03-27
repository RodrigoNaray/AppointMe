/**
 * Converts a UTC slot (HH:mm) to local browser time for a specific date.
 */
export function convertSlotUTCToLocal(slotUTC: string, date: Date): string {
  const [hours, minutes] = slotUTC.split(':').map(Number);

  const utcDate = new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
      0,
      0
    )
  );

  const localHours = utcDate.getHours();
  const localMinutes = utcDate.getMinutes();

  return `${String(localHours).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}`;
}

/**
 * Converts a local slot (HH:mm) to UTC time for a specific date.
 */
export function convertSlotLocalToUTC(slotLocal: string, date: Date): string {
  const [hours, minutes] = slotLocal.split(':').map(Number);

  const localDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0
  );

  const utcHours = localDate.getUTCHours();
  const utcMinutes = localDate.getUTCMinutes();

  return `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;
}