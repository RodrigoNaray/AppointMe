"use client"

import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/client";
import { WeeklySchedule, DaySchedule } from "@/types/availability";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const daysOfWeek = [
  { id: 'monday', label: 'Lunes' },
  { id: 'tuesday', label: 'Martes' },
  { id: 'wednesday', label: 'Miércoles' },
  { id: 'thursday', label: 'Jueves' },
  { id: 'friday', label: 'Viernes' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' },
];

const defaultDaySchedule: DaySchedule = { start: '09:00', end: '18:00', isActive: false };

export default function AvailabilityPage() {
  const [schedule, setSchedule] = useState<WeeklySchedule>({});
  const [isLoading, setIsLoading] = useState(true);

  
  const fetchSchedule = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<WeeklySchedule>('/admin/availability/schedule');
      setSchedule(response.data);
    } catch (error) {
      console.error("Error al cargar el horario", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);


  const handleScheduleChange = (dayId: string, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId] || defaultDaySchedule,
        [field]: value
      }
    }));
  };

  
  const handleSaveChanges = async () => {
    try {
      await apiClient.put('/admin/availability/schedule', schedule);
      alert('¡Horario guardado con éxito!');
    } catch (error) {
      console.error("Error al guardar el horario", error);
      alert('Hubo un error al guardar el horario.');
    }
  };

  if (isLoading) return <p>Cargando horario...</p>;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Horario Laboral Semanal</CardTitle>
          <CardDescription>Define tus horas de trabajo. Los días no marcados se considerarán no laborables.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {daysOfWeek.map(day => {
              const daySchedule = schedule[day.id] || defaultDaySchedule;
              return (
                <div key={day.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                  <Checkbox
                    id={`check-${day.id}`}
                    checked={daySchedule.isActive}
                    onCheckedChange={(checked) => handleScheduleChange(day.id, 'isActive', !!checked)}
                    className="h-5 w-5"
                  />
                  <Label htmlFor={`check-${day.id}`} className="w-24 text-sm font-medium">
                    {day.label}
                  </Label>
                  <div className="flex items-center gap-2 flex-grow">
                    <Input
                      type="time"
                      value={daySchedule.start}
                      onChange={(e) => handleScheduleChange(day.id, 'start', e.target.value)}
                      disabled={!daySchedule.isActive}
                    />
                    <span>-</span>
                    <Input
                      type="time"
                      value={daySchedule.end}
                      onChange={(e) => handleScheduleChange(day.id, 'end', e.target.value)}
                      disabled={!daySchedule.isActive}
                    />
                  </div>
                </div>
              )
            })}
             <div className="flex justify-end pt-4">
                <Button onClick={handleSaveChanges}>Guardar Cambios</Button>
            </div>
          </div>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Bloqueos de Tiempo</CardTitle>
          <CardDescription>Añade bloqueos específicos para vacaciones, citas personales o cualquier momento en que no estarás disponible.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground mb-4">No hay bloqueos de tiempo programados.</p>
            <Button variant="outline">Añadir Bloqueo</Button>
        </CardContent>
      </Card>
    </div>
  );
}