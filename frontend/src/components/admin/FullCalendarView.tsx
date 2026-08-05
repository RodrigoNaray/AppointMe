"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import apiClient from "@/api/client";
import type { CalendarEvent, WeeklySchedule, DaySchedule } from "@/types/availability";
import { rescheduleBookingByAdmin } from "@/api/modules/bookings";
import { updateBlock } from "@/api/modules/availability";
import type { EventContentArg, DayCellContentArg } from "@fullcalendar/core";

interface FullCalendarViewProps {
  onBlockSlot?: (startTime: Date, endTime: Date) => void;
  onBlockClick?: (event: CalendarEvent) => void;
  onBookingClick?: (event: CalendarEvent) => void;
  onEventsLoaded?: (events: CalendarEvent[]) => void;
  refreshKey?: number;
  onRefresh?: () => void;
  schedule?: WeeklySchedule;
}

const EVENT_CLASSES = {
  booking: "fc-event-booking",
  block: "fc-event-block",
  working_hours: "fc-event-working-hours",
} as const;

const DAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const WEEKDAY_NAMES: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

function getMonthsInRange(start: Date, end: Date): string[] {
  const months: string[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endDate = new Date(end.getFullYear(), end.getMonth(), 1);
  while (current <= endDate) {
    months.push(format(current, "yyyy-MM"));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

interface FullCalendarEventInput {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  display?: string;
  classNames: string[];
  editable?: boolean;
  durationEditable?: boolean;
  extendedProps?: Record<string, unknown>;
}

function mapEvent(event: CalendarEvent): FullCalendarEventInput {
  const startStr =
    typeof event.start === "string" ? event.start : event.start.toISOString();
  const endStr =
    typeof event.end === "string" ? event.end : event.end.toISOString();

  if (event.type === "working_hours") {
    return {
      id: `wh-${startStr}`,
      title: "",
      start: startStr,
      end: endStr,
      display: "background",
      classNames: [EVENT_CLASSES.working_hours],
      editable: false,
    };
  }

  if (event.type === "block") {
    return {
      id: event.id || `evt-${startStr}`,
      title: event.title,
      start: startStr,
      end: endStr,
      classNames: [EVENT_CLASSES.block],
      extendedProps: { ...event, start: startStr, end: endStr },
    };
  }

  const clientName = event.clientName || "";
  const serviceName = event.serviceName || "";
  const shortTitle = clientName || serviceName;

  return {
    id: event.id || `evt-${startStr}`,
    title: shortTitle,
    start: startStr,
    end: endStr,
    classNames: [EVENT_CLASSES.booking],
    durationEditable: false,
    extendedProps: { ...event, start: startStr, end: endStr },
  };
}

interface DayStats {
  bookings: number;
  blocks: number;
  occupiedMinutes: number;
  freeMinutes: number;
}

export default function FullCalendarView({
  onBlockSlot,
  onBlockClick,
  onBookingClick,
  onEventsLoaded,
  refreshKey = 0,
  onRefresh,
  schedule,
}: FullCalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [initialView] = useState(() =>
    window.innerWidth >= 768 ? "dayGridMonth" : "timeGridDay"
  );
  const [floatingTooltip, setFloatingTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);
  const [dayStats, setDayStats] = useState<DayStats | null>(null);
  const [cachedEvents, setCachedEvents] = useState<CalendarEvent[]>([]);

  const businessHours = useMemo(() => {
    if (!schedule) return undefined;
    return Object.entries(schedule)
      .filter(([, ds]) => ds.isActive)
      .flatMap(([dayName, ds]) => {
        const dayIndex = DAY_MAP[dayName];
        if (ds.end <= ds.start) {
          return [
            { daysOfWeek: [dayIndex], startTime: ds.start, endTime: "24:00" },
            { daysOfWeek: [(dayIndex + 1) % 7], startTime: "00:00", endTime: ds.end },
          ];
        }
        return [{ daysOfWeek: [dayIndex], startTime: ds.start, endTime: ds.end }];
      });
  }, [schedule]);

  const slotMinMax = useMemo(() => {
    if (!schedule) return { min: "07:00:00", max: "22:00:00" };
    let earliest = 24 * 60;
    let latest = 0;
    let hasActive = false;
    for (const day of Object.values(schedule)) {
      if (!day.isActive) continue;
      hasActive = true;
      const [sh, sm] = day.start.split(":").map(Number);
      const [eh, em] = day.end.split(":").map(Number);
      const startMins = sh * 60 + sm;
      let endMins = eh * 60 + em;
      if (endMins <= startMins) {
        endMins += 1440;
      }
      if (startMins < earliest) earliest = startMins;
      if (endMins > latest) latest = endMins;
    }
    if (!hasActive) return { min: "07:00:00", max: "22:00:00" };
    const padMin = Math.max(0, Math.floor((earliest - 30) / 60) * 60);
    const padMax = Math.ceil((latest + 30) / 60) * 60;
    const fmt = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`;
    return { min: fmt(padMin), max: fmt(padMax) };
  }, [schedule]);

  useEffect(() => {
    if (refreshKey > 0) {
      calendarRef.current?.getApi().refetchEvents();
    }
  }, [refreshKey]);

  const computeDayStats = useCallback(
    (events: CalendarEvent[]) => {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");

      const dayEvents = events.filter((e) => {
        const d = new Date(e.start);
        return (
          format(d, "yyyy-MM-dd") === todayStr &&
          e.type !== "working_hours"
        );
      });

      const bookings = dayEvents.filter((e) => e.type === "booking").length;
      const blocks = dayEvents.filter((e) => e.type === "block").length;
      let occupiedMinutes = 0;
      dayEvents.forEach((e) => {
        occupiedMinutes +=
          (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000;
      });

      const todaySchedule = schedule?.[WEEKDAY_NAMES[today.getDay()]];
      let freeMinutes = 0;
      if (todaySchedule?.isActive) {
        const [sh, sm] = todaySchedule.start.split(":").map(Number);
        const [eh, em] = todaySchedule.end.split(":").map(Number);
        const totalWorking = eh * 60 + em - (sh * 60 + sm);
        freeMinutes = Math.max(0, totalWorking - occupiedMinutes);
      }

      setDayStats({ bookings, blocks, occupiedMinutes, freeMinutes });
    },
    [schedule]
  );

  const fetchEvents = useCallback(
    async (
      fetchInfo: { start: Date; end: Date },
      successCallback: (events: FullCalendarEventInput[]) => void,
      failureCallback: (error: Error) => void
    ) => {
      try {
        const months = getMonthsInRange(fetchInfo.start, fetchInfo.end);
        const responses = await Promise.all(
          months.map((month) =>
            apiClient.get<CalendarEvent[]>(
              `/admin/availability/calendar?month=${month}`
            )
          )
        );
        const allEvents = responses.flatMap((r) => r.data);
        setCachedEvents(allEvents);
        computeDayStats(allEvents);
        onEventsLoaded?.(allEvents);
        successCallback(allEvents.map(mapEvent));
      } catch (error) {
        failureCallback(
          error instanceof Error
            ? error
            : new Error("Error al cargar el calendario")
        );
      }
    },
    [computeDayStats]
  );

  const handleEventContent = useCallback(
    (arg: EventContentArg) => {
      const props = arg.event.extendedProps as Record<string, unknown>;
      const type = props.type as string;
      if (type !== "booking") return undefined;

      const clientName = (props.clientName as string) || "";
      const serviceName = (props.serviceName as string) || "";
      const duration = (props.durationMinutes as number) || 0;

      return (
        <div className="fc-custom-booking-content leading-tight">
          <div className="font-semibold truncate text-[11px] sm:text-xs">
            {clientName}
          </div>
          <div className="text-[10px] sm:text-[11px] opacity-80 truncate">
            {serviceName}
            {duration > 0 && ` · ${duration}min`}
          </div>
        </div>
      );
    },
    []
  );

  const handleDayCellClassNames = useCallback(
    (arg: DayCellContentArg) => {
      const dayName = WEEKDAY_NAMES[arg.date.getDay()];
      const daySchedule = schedule?.[dayName];
      if (daySchedule && !daySchedule.isActive) {
        return ["fc-non-working-day"];
      }
      return [];
    },
    [schedule]
  );

  const formatStats = (stats: DayStats): string => {
    const parts: string[] = [];
    if (stats.bookings > 0)
      parts.push(`${stats.bookings} reserva${stats.bookings > 1 ? "s" : ""}`);
    if (stats.blocks > 0)
      parts.push(`${stats.blocks} bloqueo${stats.blocks > 1 ? "s" : ""}`);
    const freeH = Math.floor(stats.freeMinutes / 60);
    const freeRem = Math.round(stats.freeMinutes % 60);
    if (freeH > 0 || freeRem > 0) {
      parts.push(
        `${freeH > 0 ? `${freeH}h` : ""}${freeRem > 0 ? `${freeRem}min` : ""} libre${freeH > 0 || freeRem > 0 ? "s" : ""}`
      );
    }
    if (stats.occupiedMinutes > 0) {
      const occH = Math.floor(stats.occupiedMinutes / 60);
      parts.push(`${occH}h ocupada${occH > 1 ? "s" : ""}`);
    }
    return parts.join(" · ");
  };

  return (
    <div className="flex flex-col gap-3" style={{ containerType: 'inline-size', containerName: 'fc-container' }}>
      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground px-1">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-success shrink-0" />
          Reserva
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-destructive shrink-0" />
          Bloqueo
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-primary/20 shrink-0" />
          Horario
        </span>
      </div>

      {dayStats && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5">
          Hoy: {formatStats(dayStats)}
        </div>
      )}

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={initialView}
        locale="es"
        firstDay={1}
        height="auto"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listDay",
        }}
        buttonText={{
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
          listDay: "Agenda",
        }}
        businessHours={businessHours}
        slotMinTime={slotMinMax.min}
        slotMaxTime={slotMinMax.max}
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        nowIndicator
        selectable
        selectMirror
        dayMaxEvents
        editable
        events={fetchEvents}
        eventContent={handleEventContent}
        dayCellClassNames={handleDayCellClassNames}
        slotLaneDidMount={(arg) => {
          const m = arg.date.getHours() * 60 + arg.date.getMinutes();
          if (m % 60 === 0) {
            arg.el.classList.add("fc-slot-hour");
          }
          if (Math.floor(m / 60) % 2 === 0) {
            arg.el.classList.add("fc-slot-hour-alt");
          }
        }}
        slotLabelDidMount={(arg) => {
          const m = arg.date.getHours() * 60 + arg.date.getMinutes();
          if (m % 60 === 0) {
            arg.el.classList.add("fc-slot-label-hour");
          }
        }}
        select={(selectInfo) => {
          onBlockSlot?.(selectInfo.start, selectInfo.end);
          calendarRef.current?.getApi().unselect();
        }}
        dateClick={(clickInfo) => {
          const api = calendarRef.current?.getApi();
          if (api?.view.type === "dayGridMonth") {
            api.changeView("timeGridDay", clickInfo.date);
          }
        }}
        eventClick={(clickInfo) => {
          const extendedProps = clickInfo.event
            .extendedProps as Record<string, unknown>;
          const type = extendedProps.type as CalendarEvent["type"];

          if (type === "block") {
            onBlockClick?.({
              id: clickInfo.event.id,
              title: clickInfo.event.title,
              start: clickInfo.event.start!,
              end: clickInfo.event.end!,
              type: "block",
              reason: extendedProps.reason as string | null | undefined,
            });
          } else if (type === "booking") {
            onBookingClick?.({
              id: clickInfo.event.id,
              title: clickInfo.event.title,
              start: clickInfo.event.start!,
              end: clickInfo.event.end!,
              type: "booking",
              clientName: extendedProps.clientName as string | undefined,
              serviceName: extendedProps.serviceName as string | undefined,
              durationMinutes: extendedProps.durationMinutes as
                | number
                | undefined,
              status: extendedProps.status as string | undefined,
            });
          }
        }}
        eventDrop={async (info) => {
          const extendedProps = info.event
            .extendedProps as Record<string, unknown>;
          const type = extendedProps.type as CalendarEvent["type"];

          if (type === "booking") {
            try {
              await rescheduleBookingByAdmin(
                info.event.id,
                info.event.start!.toISOString()
              );
              toast.success("Reserva reprogramada");
              onRefresh?.();
            } catch (error) {
              info.revert();
              const err = error as { response?: { status?: number } };
              if (err?.response?.status === 409) {
                toast.error(
                  "Conflicto con otra reserva o bloqueo en ese horario"
                );
              } else {
                toast.error("Error al reprogramar la reserva");
              }
            }
          } else if (type === "block") {
            try {
              await updateBlock(info.event.id, {
                startTime: info.event.start!.toISOString(),
                endTime: info.event.end!.toISOString(),
              });
              toast.success("Bloqueo movido");
              onRefresh?.();
            } catch {
              info.revert();
              toast.error("Error al mover el bloqueo");
            }
          } else {
            info.revert();
          }
        }}
        eventResize={async (info) => {
          const extendedProps = info.event
            .extendedProps as Record<string, unknown>;
          const type = extendedProps.type as CalendarEvent["type"];

          if (type === "block") {
            try {
              await updateBlock(info.event.id, {
                startTime: info.event.start!.toISOString(),
                endTime: info.event.end!.toISOString(),
              });
              toast.success("Bloqueo actualizado");
              onRefresh?.();
            } catch {
              info.revert();
              toast.error("Error al redimensionar el bloqueo");
            }
          } else {
            info.revert();
          }
        }}
        eventMouseEnter={(info) => {
          const extendedProps = info.event
            .extendedProps as Record<string, unknown>;
          const type = extendedProps.type as CalendarEvent["type"];

          if (type !== "working_hours") {
            const lines: string[] = [info.event.title];
            const clientName = extendedProps.clientName as string | undefined;
            const serviceName = extendedProps.serviceName as string | undefined;
            const status = extendedProps.status as string | undefined;
            const start = info.event.start;
            const end = info.event.end;

            if (clientName) lines.push(`Cliente: ${clientName}`);
            if (serviceName) lines.push(`Servicio: ${serviceName}`);
            if (status) {
              lines.push(
                `Estado: ${status === "CONFIRMED" ? "Confirmada" : status}`
              );
            }
            if (start && end) {
              const mins = Math.round(
                (end.getTime() - start.getTime()) / 60000
              );
              lines.push(`Duración: ${mins} min`);
            }

            setFloatingTooltip({
              x: info.jsEvent.clientX + 12,
              y: info.jsEvent.clientY + 12,
              content: lines.join("\n"),
            });
          }
        }}
        eventMouseLeave={() => {
          setFloatingTooltip(null);
        }}
      />

      {floatingTooltip && (
        <div
          className="fixed z-[100] max-w-[220px] px-3 py-2 rounded-lg bg-popover text-popover-foreground text-xs shadow-lg border pointer-events-none whitespace-pre-line leading-relaxed"
          style={{
            left: floatingTooltip.x,
            top: floatingTooltip.y,
          }}
        >
          {floatingTooltip.content}
        </div>
      )}
    </div>
  );
}
