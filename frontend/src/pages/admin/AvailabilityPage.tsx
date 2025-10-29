"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/client";
import {
  WeeklySchedule,
  DaySchedule,
  AvailabilityBlock,
} from "@/types/availability";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Modal from "@/components/Modal";
import BlockForm from "@/components/BlockForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AdminCalendar from "./availability/AdminCalendar";

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

/**
 * Convierte hora UTC "HH:mm" a hora local del navegador
 * Backend almacena en UTC, UI muestra en hora local
 * @param timeUTC - Hora en formato "HH:mm" UTC (ej: "12:00" = 12:00 UTC)
 * @returns Hora en formato "HH:mm" local (ej: "09:00" para UTC-3)
 */
function convertTimeUTCToLocal(timeUTC: string): string {
  const [hours, minutes] = timeUTC.split(':').map(Number);
  
  // Crear fecha arbitraria en UTC con la hora especificada
  const utcDate = new Date(Date.UTC(2000, 0, 1, hours, minutes, 0, 0));
  
  // Convertir a hora local del navegador
  const localHours = utcDate.getHours();
  const localMinutes = utcDate.getMinutes();
  
  return `${String(localHours).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}`;
}

/**
 * Convierte hora local "HH:mm" a UTC para enviar al backend
 * @param timeLocal - Hora en formato "HH:mm" local (ej: "09:00")
 * @returns Hora en formato "HH:mm" UTC (ej: "12:00" para UTC-3)
 */
function convertTimeLocalToUTC(timeLocal: string): string {
  const [hours, minutes] = timeLocal.split(':').map(Number);
  
  // Crear fecha en timezone local
  const localDate = new Date(2000, 0, 1, hours, minutes, 0, 0);
  
  // Extraer componentes UTC
  const utcHours = localDate.getUTCHours();
  const utcMinutes = localDate.getUTCMinutes();
  
  return `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;
}

export default function AvailabilityPage() {
  const [schedule, setSchedule] = useState<WeeklySchedule>({});
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [scheduleResponse, blocksResponse] = await Promise.all([
        apiClient.get<WeeklySchedule>("/admin/availability/schedule"),
        apiClient.get<AvailabilityBlock[]>("/admin/availability/blocks"),
      ]);
      
      // Convertir horarios UTC → local para display
      const scheduleLocal: WeeklySchedule = {};
      for (const [day, daySchedule] of Object.entries(scheduleResponse.data)) {
        scheduleLocal[day] = {
          ...daySchedule,
          start: convertTimeUTCToLocal(daySchedule.start),
          end: convertTimeUTCToLocal(daySchedule.end),
        };
      }
      
      setSchedule(scheduleLocal);
      setBlocks(blocksResponse.data);
    } catch (error) {
      console.error("Error al cargar los datos de disponibilidad", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScheduleChange = (
    dayId: string,
    field: keyof DaySchedule,
    value: string | boolean
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [dayId]: { ...(prev[dayId] || defaultDaySchedule), [field]: value },
    }));
  };

  const handleSaveChanges = async () => {
    try {
      // Convertir horarios local → UTC antes de enviar al backend
      const scheduleUTC: WeeklySchedule = {};
      for (const [day, daySchedule] of Object.entries(schedule)) {
        scheduleUTC[day] = {
          ...daySchedule,
          start: convertTimeLocalToUTC(daySchedule.start),
          end: convertTimeLocalToUTC(daySchedule.end),
        };
      }
      
      await apiClient.put("/admin/availability/schedule", scheduleUTC);
      alert("¡Horario guardado con éxito!");
    } catch (error) {
      console.error("Error al guardar el horario", error);
      alert("Hubo un error al guardar el horario.");
    }
  };

  const handleCreateBlock = async (data: {
    startTime: string;
    endTime: string;
    reason: string;
  }) => {
    try {
      const newBlock = {
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        reason: data.reason,
      };
      await apiClient.post("/admin/availability/blocks", newBlock);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error al crear el bloqueo", error);
      alert("Hubo un error al crear el bloqueo.");
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      await apiClient.delete(`/admin/availability/blocks/${blockId}`);
      fetchData();
    } catch (error) {
      console.error("Error al eliminar el bloqueo", error);
      alert("Hubo un error al eliminar el bloqueo.");
    }
  };

  if (isLoading) return <p>Cargando disponibilidad...</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {" "}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Horario Laboral Semanal</CardTitle>
            <CardDescription>
              Define tus horas de trabajo. Los días no marcados se considerarán
              no laborables.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {daysOfWeek.map((day) => {
                const daySchedule = schedule[day.id] || defaultDaySchedule;
                return (
                  <div
                    key={day.id}
                    className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`check-${day.id}`}
                      checked={daySchedule.isActive}
                      onCheckedChange={(checked) =>
                        handleScheduleChange(day.id, "isActive", !!checked)
                      }
                      className="h-5 w-5"
                    />
                    <Label
                      htmlFor={`check-${day.id}`}
                      className="w-24 text-sm font-medium"
                    >
                      {day.label}
                    </Label>
                    <div className="flex items-center gap-2 flex-grow">
                      <Input
                        type="time"
                        value={daySchedule.start}
                        onChange={(e) =>
                          handleScheduleChange(day.id, "start", e.target.value)
                        }
                        disabled={!daySchedule.isActive}
                      />
                      <span>-</span>
                      <Input
                        type="time"
                        value={daySchedule.end}
                        onChange={(e) =>
                          handleScheduleChange(day.id, "end", e.target.value)
                        }
                        disabled={!daySchedule.isActive}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveChanges}>Guardar Cambios</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Bloqueos de Tiempo</CardTitle>
            <CardDescription>
              Añade bloqueos específicos para vacaciones, citas personales o
              cualquier momento en que no estarás disponible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {blocks.length > 0 ? (
                blocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex justify-between items-center p-2 rounded-md bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">
                        {block.reason || "Bloqueo sin motivo"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(
                          new Date(block.startTime),
                          "d 'de' MMMM, HH:mm",
                          { locale: es }
                        )}{" "}
                        -{" "}
                        {format(new Date(block.endTime), "HH:mm'hs'", {
                          locale: es,
                        })}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará
                            permanentemente el bloqueo de tiempo.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteBlock(block.id)}
                          >
                            Continuar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  No hay bloqueos de tiempo programados.
                </p>
              )}
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsModalOpen(true)}
            >
              Añadir Bloqueo
            </Button>
          </CardContent>
        </Card>
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Añadir Nuevo Bloqueo"
        >
          <BlockForm
            onCancel={() => setIsModalOpen(false)}
            onSubmit={handleCreateBlock}
          />
        </Modal>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Vista de Calendario</CardTitle>
            <CardDescription>
              Un resumen visual de tu disponibilidad, bloqueos y futuras
              reservas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminCalendar />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
