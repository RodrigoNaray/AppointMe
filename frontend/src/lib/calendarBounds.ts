import type { WeeklySchedule } from "@/types/availability";

export interface SlotBounds {
  min: string;
  max: string;
}

const DEFAULT_BOUNDS: SlotBounds = { min: "07:00:00", max: "22:00:00" };
const MINUTES_PER_DAY = 1440;

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatMinutes = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;

export function computeSlotBounds(schedule?: WeeklySchedule): SlotBounds {
  if (!schedule) return DEFAULT_BOUNDS;

  let earliest = MINUTES_PER_DAY;
  let latest = 0;
  let hasActive = false;

  for (const day of Object.values(schedule)) {
    if (!day.isActive) continue;
    hasActive = true;
    const startMins = toMinutes(day.start);
    let endMins = toMinutes(day.end);
    if (endMins <= startMins) {
      endMins += MINUTES_PER_DAY;
    }
    if (startMins < earliest) earliest = startMins;
    if (endMins > latest) latest = endMins;
  }

  if (!hasActive) return DEFAULT_BOUNDS;

  const padMin = Math.max(0, Math.floor((earliest - 30) / 60) * 60);
  const cappedLatest = Math.min(latest, MINUTES_PER_DAY);
  const padMax = Math.min(
    Math.ceil((cappedLatest + 30) / 60) * 60,
    MINUTES_PER_DAY
  );

  return { min: formatMinutes(padMin), max: formatMinutes(padMax) };
}
