export interface DaySchedule {
  start: string;
  end: string;
  isActive: boolean;
}

export interface WeeklySchedule {
  [key: string]: DaySchedule;
}

export interface AvailabilityBlock {
  id: string;
  startTime: string; // Las fechas llegan como strings en formato ISO
  endTime: string;
  reason: string | null;
  createdAt: string;
}