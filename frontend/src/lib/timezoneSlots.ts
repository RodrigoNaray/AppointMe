/**
 * Converts a list of UTC slots (HH:mm) to local browser time for a specific date.
 * The backend generates slots for a UTC day; when the working window crosses
 * midnight in UTC (e.g. 20:00-02:00), the tail slots (00:00-02:00) belong to the
 * NEXT UTC day. The wrap is detected by a slot being earlier than the previous one.
 */
export function convertSlotsUTCToLocal(slotsUTC: string[], date: Date): string[] {
  let dayOffset = 0;
  let previousMinutes = -1;

  return slotsUTC.map((slotUTC) => {
    const [hours, minutes] = slotUTC.split(':').map(Number);
    const slotMinutes = hours * 60 + minutes;

    if (previousMinutes >= 0 && slotMinutes < previousMinutes) {
      dayOffset += 1;
    }
    previousMinutes = slotMinutes;

    const utcDate = new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + dayOffset,
        hours,
        minutes,
        0,
        0
      )
    );

    const localHours = utcDate.getHours();
    const localMinutes = utcDate.getMinutes();

    return `${String(localHours).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}`;
  });
}

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