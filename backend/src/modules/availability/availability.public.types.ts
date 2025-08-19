export interface DaySchedule {
  start: string; // ej: "09:00"
  end: string;   // ej: "18:00"
  isActive: boolean;
}

export interface WeeklySchedule {
  [key: string]: DaySchedule;
}

export type UpdateScheduleDto = WeeklySchedule;

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  type: 'booking' | 'block' | 'working_hours';
}