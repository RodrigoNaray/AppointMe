export interface DaySchedule {
  start: string; 
  end: string;   
  isActive: boolean; 
}

export interface WeeklySchedule {
  [key: string]: DaySchedule;
}

export type UpdateScheduleDto = WeeklySchedule;