import type { BusinessHours } from "@/api/modules/settings";
import { convertSlotUTCToLocal } from "@/lib/timezoneSlots";

export const WEEK_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const SPANISH_DAY: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

export const SPANISH_DAY_SHORT: Record<string, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
  sunday: "Dom",
};

export interface WeekScheduleRow {
  key: (typeof WEEK_ORDER)[number];
  dayLabel: string;
  dayShortLabel: string;
  isOpen: boolean;
  open: string;
  close: string;
  isToday: boolean;
}

const nextDay = (date: Date): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
};

const localTimes = (openUTC: string, closeUTC: string, date: Date): { open: string; close: string } => {
  const wrap = closeUTC <= openUTC;
  const closeDate = wrap ? nextDay(date) : date;
  return {
    open: convertSlotUTCToLocal(openUTC, date),
    close: convertSlotUTCToLocal(closeUTC, closeDate),
  };
};

export const getWeekScheduleRows = (
  businessHours?: BusinessHours,
  date: Date = new Date()
): WeekScheduleRow[] => {
  const todayKey = WEEK_ORDER[date.getDay() === 0 ? 6 : date.getDay() - 1];

  return WEEK_ORDER.map((key) => {
    const day = businessHours?.[key];
    const isOpen = day?.isOpen === true;
    const { open, close } = isOpen
      ? localTimes(day.openTime, day.closeTime, date)
      : { open: "", close: "" };

    return {
      key,
      dayLabel: SPANISH_DAY[key],
      dayShortLabel: SPANISH_DAY_SHORT[key],
      isOpen,
      open,
      close,
      isToday: key === todayKey,
    };
  });
};
