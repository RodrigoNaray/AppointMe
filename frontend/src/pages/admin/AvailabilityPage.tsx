"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import apiClient from "@/api/client";
import type {
  WeeklySchedule,
  DaySchedule,
  AvailabilityBlock,
  CalendarEvent,
} from "@/types/availability";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, Tag, Loader2, Search, Lock, CalendarPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageSkeleton } from "@/components/admin/PageSkeleton";
import FullCalendarView from "@/components/admin/FullCalendarView";
import WeeklyScheduleCard from "@/components/admin/WeeklyScheduleCard";
import BlocksListCard from "@/components/admin/BlocksListCard";
import BlockForm from "@/components/BlockForm";
import { cancelBookingByAdmin, rescheduleBookingByAdmin, createBookingByAdmin } from "@/api/modules/bookings";
import { getAdminClients, type AdminClient } from "@/api/modules/clients";

const defaultDaySchedule: DaySchedule = {
  start: "09:00",
  end: "18:00",
  isActive: false,
};

function convertTimeUTCToLocal(timeUTC: string): string {
  const [hours, minutes] = timeUTC.split(":").map(Number);
  const utcDate = new Date(Date.UTC(2000, 0, 1, hours, minutes, 0, 0));
  const localHours = utcDate.getHours();
  const localMinutes = utcDate.getMinutes();
  return `${String(localHours).padStart(2, "0")}:${String(localMinutes).padStart(2, "0")}`;
}

function convertTimeLocalToUTC(timeLocal: string): string {
  const [hours, minutes] = timeLocal.split(":").map(Number);
  const localDate = new Date(2000, 0, 1, hours, minutes, 0, 0);
  const utcHours = localDate.getUTCHours();
  const utcMinutes = localDate.getUTCMinutes();
  return `${String(utcHours).padStart(2, "0")}:${String(utcMinutes).padStart(2, "0")}`;
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AvailabilityPage() {
  const [schedule, setSchedule] = useState<WeeklySchedule>({});
  const [initialSchedule, setInitialSchedule] = useState<WeeklySchedule>({});
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [blockModalDefaults, setBlockModalDefaults] = useState<{
    startTime: string;
    endTime: string;
  } | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<string | null>(null);
  const [bookingInfo, setBookingInfo] = useState<CalendarEvent | null>(null);
  const [activeTab, setActiveTab] = useState("calendar");
  const [refreshKey, setRefreshKey] = useState(0);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [rescheduleBookingId, setRescheduleBookingId] = useState<
    string | null
  >(null);
  const [newDateTime, setNewDateTime] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [slotAction, setSlotAction] = useState<{
    startTime: Date;
    endTime: Date;
  } | null>(null);
  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [searchClientQuery, setSearchClientQuery] = useState("");
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [services, setServices] = useState<{ id: string; name: string; durationMinutes: number }[]>([]);
  const [creatingBooking, setCreatingBooking] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [scheduleResponse, blocksResponse] = await Promise.all([
        apiClient.get<WeeklySchedule>("/admin/availability/schedule"),
        apiClient.get<AvailabilityBlock[]>("/admin/availability/blocks"),
      ]);

      const scheduleLocal: WeeklySchedule = {};
      for (const [day, daySchedule] of Object.entries(scheduleResponse.data)) {
        scheduleLocal[day] = {
          ...daySchedule,
          start: convertTimeUTCToLocal(daySchedule.start),
          end: convertTimeUTCToLocal(daySchedule.end),
        };
      }

      setSchedule(scheduleLocal);
      setInitialSchedule(scheduleLocal);
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

  const isDirty =
    JSON.stringify(schedule) !== JSON.stringify(initialSchedule);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

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
      const scheduleUTC: WeeklySchedule = {};
      for (const [day, daySchedule] of Object.entries(schedule)) {
        scheduleUTC[day] = {
          ...daySchedule,
          start: convertTimeLocalToUTC(daySchedule.start),
          end: convertTimeLocalToUTC(daySchedule.end),
        };
      }

      await apiClient.put("/admin/availability/schedule", scheduleUTC);
      setInitialSchedule(schedule);
      toast.success("Horario guardado con éxito");
    } catch (error) {
      console.error("Error al guardar el horario", error);
      toast.error("Hubo un error al guardar el horario.");
    }
  };

  const openBlockModal = useCallback(() => {
    setBlockModalDefaults(null);
    setIsModalOpen(true);
  }, []);

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
      setBlockModalDefaults(null);
      fetchData();
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Error al crear el bloqueo", error);
      toast.error("Hubo un error al crear el bloqueo.");
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      await apiClient.delete(`/admin/availability/blocks/${blockId}`);
      setBlockToDelete(null);
      fetchData();
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Error al eliminar el bloqueo", error);
      toast.error("Hubo un error al eliminar el bloqueo.");
    }
  };

  const handleBlockSlot = (startTime: Date, endTime: Date) => {
    setBlockModalDefaults({
      startTime: formatDateForInput(startTime),
      endTime: formatDateForInput(endTime),
    });
    setIsModalOpen(true);
  };

  const handleCalendarBlockClick = (blockId: string) => {
    setBlockToDelete(blockId);
  };

  const handleOpenCancelDialog = (bookingId: string) => {
    setCancelBookingId(bookingId);
    setCancelReason("");
  };

  const handleCancelBooking = async () => {
    if (!cancelBookingId) return;
    setIsCancelling(true);
    try {
      await cancelBookingByAdmin(
        cancelBookingId,
        cancelReason.trim() || undefined
      );
      toast.success("Reserva cancelada exitosamente");
      setCancelBookingId(null);
      setCancelReason("");
      setBookingInfo(null);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Error al cancelar la reserva", error);
      toast.error("Hubo un error al cancelar la reserva.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleOpenRescheduleDialog = (bookingId: string) => {
    setRescheduleBookingId(bookingId);
    setNewDateTime("");
  };

  const handleRescheduleBooking = async () => {
    if (!rescheduleBookingId || !newDateTime) return;
    setIsRescheduling(true);
    try {
      const isoTime = new Date(newDateTime).toISOString();
      await rescheduleBookingByAdmin(rescheduleBookingId, isoTime);
      toast.success("Reserva reprogramada exitosamente");
      setRescheduleBookingId(null);
      setNewDateTime("");
      setBookingInfo(null);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Error al reprogramar la reserva", error);
      toast.error("Hubo un error al reprogramar la reserva.");
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleSlotClick = (startTime: Date, endTime: Date) => {
    setSlotAction({ startTime, endTime });
    setIsSlotDialogOpen(true);
  };

  const handleOpenBookingForm = () => {
    setClients([]);
    setSearchClientQuery("");
    setSelectedClientId("");
    setSelectedServiceId("");
    setIsSlotDialogOpen(false);
    setIsBookingFormOpen(true);

    apiClient
      .get<{ id: string; name: string; durationMinutes: number }[]>(
        "services"
      )
      .then((r) => setServices(r.data))
      .catch(() => toast.error("Error al cargar servicios"));
  };

  const fetchClients = async (query: string) => {
    setSearchClientQuery(query);
    if (query.length < 2) {
      setClients([]);
      return;
    }
    setSearchingClients(true);
    try {
      const results = await getAdminClients(query);
      setClients(results);
    } catch {
      toast.error("Error al buscar clientes");
    } finally {
      setSearchingClients(false);
    }
  };

  const handleCreateManualBooking = async () => {
    if (!selectedClientId || !selectedServiceId || !slotAction) return;
    setCreatingBooking(true);
    try {
      await createBookingByAdmin({
        clientId: selectedClientId,
        serviceId: selectedServiceId,
        bookingTime: slotAction.startTime.toISOString(),
      });
      toast.success("Reserva creada exitosamente");
      setIsBookingFormOpen(false);
      setSlotAction(null);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      if (err?.response?.status === 409) {
        toast.error("El horario no está disponible");
      } else {
        toast.error(err?.response?.data?.message || "Error al crear la reserva");
      }
    } finally {
      setCreatingBooking(false);
    }
  };

  if (isLoading) return <PageSkeleton variant="availability" />;

  return (
    <div className="flex flex-col">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col gap-4"
      >
        <TabsList className="w-full sm:w-auto grid grid-cols-3">
          <TabsTrigger value="calendar" className="gap-1.5">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendario</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Horario</span>
          </TabsTrigger>
          <TabsTrigger value="blocks" className="gap-1.5">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Bloqueos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <FullCalendarView
            onBlockSlot={handleSlotClick}
            onBlockClick={handleCalendarBlockClick}
            onBookingClick={(event) => setBookingInfo(event)}
            refreshKey={refreshKey}
            onRefresh={() => setRefreshKey((k) => k + 1)}
            schedule={schedule}
          />
        </TabsContent>

        <TabsContent value="schedule">
          <WeeklyScheduleCard
            schedule={schedule}
            isDirty={isDirty}
            onScheduleChange={handleScheduleChange}
            onSave={handleSaveChanges}
          />
        </TabsContent>

        <TabsContent value="blocks">
          <BlocksListCard
            blocks={blocks}
            onAdd={openBlockModal}
            onDelete={(blockId) => setBlockToDelete(blockId)}
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setBlockModalDefaults(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Bloqueo</DialogTitle>
          </DialogHeader>
          <BlockForm
            onCancel={() => {
              setIsModalOpen(false);
              setBlockModalDefaults(null);
            }}
            onSubmit={handleCreateBlock}
            defaultStartTime={blockModalDefaults?.startTime}
            defaultEndTime={blockModalDefaults?.endTime}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={blockToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setBlockToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente
              el bloqueo de tiempo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBlockToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                blockToDelete && handleDeleteBlock(blockToDelete)
              }
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={bookingInfo !== null}
        onOpenChange={(open) => {
          if (!open) setBookingInfo(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de Reserva</DialogTitle>
          </DialogHeader>
          {bookingInfo && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">
                  {bookingInfo.clientName || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Servicio</p>
                <p className="font-medium">
                  {bookingInfo.serviceName || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Fecha y hora
                </p>
                <p className="font-medium">
                  {format(
                    new Date(bookingInfo.start),
                    "d 'de' MMMM, HH:mm",
                    { locale: es }
                  )}
                  {" - "}
                  {format(new Date(bookingInfo.end), "HH:mm'hs'", {
                    locale: es,
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duración</p>
                <p className="font-medium">
                  {bookingInfo.durationMinutes || "—"} min
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="font-medium">
                  {bookingInfo.status === "CONFIRMED"
                    ? "Confirmada"
                    : bookingInfo.status || "—"}
                </p>
              </div>
            </div>
          )}
          {bookingInfo?.status === "CONFIRMED" && (
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => {
                  handleOpenCancelDialog(bookingInfo.id || "");
                }}
              >
                Cancelar reserva
              </Button>
              <Button
                onClick={() => {
                  handleOpenRescheduleDialog(bookingInfo.id || "");
                }}
              >
                Reprogramar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={cancelBookingId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCancelBookingId(null);
            setCancelReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reserva</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas cancelar esta reserva? Se enviará
              un email al cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Ej: El profesional no estará disponible ese día"
              maxLength={500}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setCancelBookingId(null);
                setCancelReason("");
              }}
            >
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              disabled={isCancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isCancelling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Cancelar reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={rescheduleBookingId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleBookingId(null);
            setNewDateTime("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprogramar reserva</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-datetime">Nueva fecha y hora</Label>
              <Input
                id="new-datetime"
                type="datetime-local"
                value={newDateTime}
                onChange={(e) => setNewDateTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleBookingId(null);
                setNewDateTime("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRescheduleBooking}
              disabled={isRescheduling || !newDateTime}
            >
              {isRescheduling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Reprogramar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSlotDialogOpen}
        onOpenChange={setIsSlotDialogOpen}
      >
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>¿Qué querés hacer?</DialogTitle>
          </DialogHeader>
          {slotAction && (
            <p className="text-sm text-muted-foreground text-center -mt-2">
              {format(slotAction.startTime, "d 'de' MMMM, HH:mm", {
                locale: es,
              })}
              {" - "}
              {format(slotAction.endTime, "HH:mm", { locale: es })}
            </p>
          )}
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              className="h-14 text-base justify-start gap-3 px-4"
              onClick={() => {
                setIsSlotDialogOpen(false);
                if (slotAction) {
                  handleBlockSlot(slotAction.startTime, slotAction.endTime);
                }
              }}
            >
              <Lock className="h-5 w-5 text-destructive" />
              <div className="text-left">
                <span className="block font-medium">Bloquear horario</span>
                <span className="block text-xs text-muted-foreground">
                  No disponible en esta franja
                </span>
              </div>
            </Button>
            <Button
              className="h-14 text-base justify-start gap-3 px-4"
              onClick={handleOpenBookingForm}
            >
              <CalendarPlus className="h-5 w-5" />
              <div className="text-left">
                <span className="block font-medium">Crear reserva</span>
                <span className="block text-xs opacity-80">
                  Asignar un turno a un cliente
                </span>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isBookingFormOpen}
        onOpenChange={(open) => {
          setIsBookingFormOpen(open);
          if (!open) setSlotAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear reserva manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Buscar cliente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Escribí nombre o email..."
                  value={searchClientQuery}
                  onChange={(e) => fetchClients(e.target.value)}
                />
              </div>
              {searchingClients && (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {clients.length > 0 && (
                <div className="max-h-32 overflow-y-auto border rounded-md">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                        selectedClientId === c.id
                          ? "bg-primary/10 font-medium"
                          : ""
                      }`}
                      onClick={() => setSelectedClientId(c.id)}
                    >
                      <span className="block">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {c.email}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {searchClientQuery.length >= 2 &&
                !searchingClients &&
                clients.length === 0 && (
                  <p className="text-xs text-muted-foreground py-1">
                    No se encontraron clientes
                  </p>
                )}
            </div>

            <div className="space-y-2">
              <Label>Servicio</Label>
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegí un servicio..." />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {slotAction && (
              <div className="space-y-2">
                <Label>Fecha y hora</Label>
                <p className="text-sm bg-muted rounded-md px-3 py-2">
                  {format(
                    slotAction.startTime,
                    "d 'de' MMMM 'de' yyyy, HH:mm",
                    { locale: es }
                  )}
                  {" - "}
                  {format(
                    slotAction.endTime,
                    "HH:mm",
                    { locale: es }
                  )}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsBookingFormOpen(false);
                setSlotAction(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateManualBooking}
              disabled={!selectedClientId || !selectedServiceId || creatingBooking}
            >
              {creatingBooking ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Crear reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isDirty && activeTab === "schedule" && (
        <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              Cambios sin guardar
            </span>
            <Button size="sm" onClick={handleSaveChanges}>
              Guardar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
