"use client"

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

export default function AvailabilityPage() {

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Horario Laboral Semanal</CardTitle>
          <CardDescription>Define tus horas de trabajo para cada día. Los días no marcados se considerarán no laborables.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            {daysOfWeek.map(day => (
              <div key={day.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                <Checkbox id={`check-${day.id}`} className="h-5 w-5" />
                <Label htmlFor={`check-${day.id}`} className="w-24 text-sm font-medium">
                  {day.label}
                </Label>
                <div className="flex items-center gap-2 flex-grow">
                  <Input type="time" defaultValue="09:00" />
                  <span>-</span>
                  <Input type="time" defaultValue="18:00" />
                </div>
              </div>
            ))}
             <div className="flex justify-end pt-4">
                <Button>Guardar Horario</Button>
            </div>
          </form>
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