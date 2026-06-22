"use client";

import type { WeeklySchedule, DaySchedule } from "@/types/availability";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const daysOfWeek = [
  { id: "monday", label: "Lunes" },
  { id: "tuesday", label: "Martes" },
  { id: "wednesday", label: "Miércoles" },
  { id: "thursday", label: "Jueves" },
  { id: "friday", label: "Viernes" },
  { id: "saturday", label: "Sábado" },
  { id: "sunday", label: "Domingo" },
];

const defaultDaySchedule: DaySchedule = {
  start: "09:00",
  end: "18:00",
  isActive: false,
};

interface WeeklyScheduleCardProps {
  schedule: WeeklySchedule;
  isDirty: boolean;
  onScheduleChange: (
    dayId: string,
    field: keyof DaySchedule,
    value: string | boolean
  ) => void;
  onSave: () => void;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

function ensureOption(options: string[], value: string): string[] {
  if (value && !options.includes(value)) {
    return [...options, value].sort();
  }
  return options;
}

export default function WeeklyScheduleCard({
  schedule,
  isDirty,
  onScheduleChange,
  onSave,
}: WeeklyScheduleCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Horario Laboral Semanal</CardTitle>
            <CardDescription>
              Define tus horas de trabajo. Los días no marcados se
              considerarán no laborables.
            </CardDescription>
          </div>
          {isDirty && (
            <Badge variant="secondary" className="flex-shrink-0">
              Sin guardar
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {daysOfWeek.map((day) => {
            const daySchedule = schedule[day.id] || defaultDaySchedule;
            return (
              <div
                key={day.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-2.5 sm:p-3 rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id={`check-${day.id}`}
                    checked={daySchedule.isActive}
                    onCheckedChange={(checked) =>
                      onScheduleChange(day.id, "isActive", !!checked)
                    }
                    className="h-5 w-5"
                  />
                  <Label
                    htmlFor={`check-${day.id}`}
                    className="text-sm font-medium"
                  >
                    {day.label}
                  </Label>
                </div>
                <div className="flex items-center gap-2 pl-[30px] sm:pl-0 sm:flex-1">
                  <Select
                    value={daySchedule.start}
                    onValueChange={(value) =>
                      onScheduleChange(day.id, "start", value)
                    }
                    disabled={!daySchedule.isActive}
                  >
                    <SelectTrigger className="h-9 px-2 text-sm flex-1 sm:flex-none sm:w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ensureOption(TIME_OPTIONS, daySchedule.start).map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground shrink-0">—</span>
                  <Select
                    value={daySchedule.end}
                    onValueChange={(value) =>
                      onScheduleChange(day.id, "end", value)
                    }
                    disabled={!daySchedule.isActive}
                  >
                    <SelectTrigger className="h-9 px-2 text-sm flex-1 sm:flex-none sm:w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ensureOption(TIME_OPTIONS, daySchedule.end).map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
          <div className="flex justify-end pt-4">
            <Button onClick={onSave}>Guardar Cambios</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
