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
  id?: string;
  title: string;
  start: Date;
  end: Date;
  type: 'booking' | 'block' | 'working_hours';
  clientName?: string;
  serviceName?: string;
  durationMinutes?: number;
  status?: string;
  reason?: string | null;
}

export interface UpdateBlockDto {
  startTime: string;
  endTime: string;
  reason?: string;
}