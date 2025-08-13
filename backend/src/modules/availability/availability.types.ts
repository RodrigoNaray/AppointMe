export interface DaySchedule {
  start: string; 
  end: string;   
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