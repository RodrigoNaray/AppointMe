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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
                  <Input
                    type="time"
                    value={daySchedule.start}
                    onChange={(e) =>
                      onScheduleChange(day.id, "start", e.target.value)
                    }
                    disabled={!daySchedule.isActive}
                    className="h-9 px-2 text-sm flex-1 sm:flex-none sm:w-28"
                  />
                  <span className="text-muted-foreground shrink-0">—</span>
                  <Input
                    type="time"
                    value={daySchedule.end}
                    onChange={(e) =>
                      onScheduleChange(day.id, "end", e.target.value)
                    }
                    disabled={!daySchedule.isActive}
                    className="h-9 px-2 text-sm flex-1 sm:flex-none sm:w-28"
                  />
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
