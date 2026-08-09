import type { BusinessHours } from "@/api/modules/settings";
import { convertSlotUTCToLocal } from "@/lib/timezoneSlots";

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const SPANISH_DAY_SHORT: Record<string, string> = {
  sunday: "Dom",
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
};

const nextDay = (date: Date): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
};

const isSameHours = (a: { open: string; close: string }, b: { open: string; close: string }): boolean =>
  a.open === b.open && a.close === b.close;

interface OpenDay {
  key: (typeof DAY_KEYS)[number];
  open: string;
  close: string;
}

const toLocalDay = (day: OpenDay, date: Date): { open: string; close: string } => {
  const wrap = day.close <= day.open;
  const closeDate = wrap ? nextDay(date) : date;
  return {
    open: convertSlotUTCToLocal(day.open, date),
    close: convertSlotUTCToLocal(day.close, closeDate),
  };
};

export const formatOpenDaysSummary = (
  businessHours?: BusinessHours,
  date: Date = new Date()
): string | null => {
  if (!businessHours) return null;

  const openDays: OpenDay[] = DAY_KEYS.filter((key) => businessHours[key]?.isOpen).map((key) => ({
    key,
    open: businessHours[key].openTime,
    close: businessHours[key].closeTime,
  }));

  if (openDays.length === 0) return null;

  const todayKey = DAY_KEYS[date.getDay()];
  const today = openDays.find((d) => d.key === todayKey);

  if (today) {
    const { open, close } = toLocalDay(today, date);
    return `Hoy · ${open} - ${close}`;
  }

  const isConsecutiveRange =
    openDays.length > 1 &&
    openDays.every((d, i) => i === 0 || DAY_KEYS.indexOf(d.key) === DAY_KEYS.indexOf(openDays[i - 1].key) + 1);

  if (isConsecutiveRange) {
    const firstLocal = toLocalDay(openDays[0], date);
    const allShareHours = openDays.every((d) => isSameHours(toLocalDay(d, date), firstLocal));
    if (allShareHours) {
      return `${SPANISH_DAY_SHORT[openDays[0].key]} a ${SPANISH_DAY_SHORT[openDays[openDays.length - 1].key]} · ${firstLocal.open} - ${firstLocal.close}`;
    }
  }

  return openDays
    .map((d) => {
      const { open, close } = toLocalDay(d, date);
      return `${SPANISH_DAY_SHORT[d.key]} ${open}-${close}`;
    })
    .join(" · ");
};
