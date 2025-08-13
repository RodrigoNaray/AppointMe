"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  Grid,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  startOfWeek,
  addDays,
  isSameDay,
  eachHourOfInterval,
  isWithinInterval,
} from "date-fns";
import { es } from "date-fns/locale";
import apiClient from "@/api/client";
import { CalendarEvent } from "@/types/availability";

type ViewType = "day" | "week" | "month";

const EventCard = ({ event }: { event: CalendarEvent }) => {
  const getEventColor = (type: CalendarEvent["type"]): string => {
    switch (type) {
      case "working_hours":
        return "bg-blue-100 border-blue-200 text-blue-800";
      case "block":
        return "bg-red-100 border-red-200 text-red-800";
      case "booking":
        return "bg-green-100 border-green-200 text-green-800";
      default:
        return "bg-gray-100 border-gray-200 text-gray-800";
    }
  };

  return (
    <div className={`p-1 rounded text-xs border ${getEventColor(event.type)}`}>
      <p className="font-semibold truncate">{event.title}</p>
      <p className="text-xs opacity-80">
        {format(new Date(event.start), "HH:mm")} -{" "}
        {format(new Date(event.end), "HH:mm")}
      </p>
    </div>
  );
};

export function AdminCalendar() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<ViewType>("month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const monthQuery = format(currentDate, "yyyy-MM-dd");
        const response = await apiClient.get<CalendarEvent[]>(
          `/admin/availability/calendar?month=${monthQuery}`
        );
        setEvents(response.data);
      } catch (error) {
        console.error("Error al cargar los eventos del calendario", error);
      }
    };
    fetchEvents();
  }, [currentDate]);

  const navigateDate = (direction: "prev" | "next"): void => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate);
      switch (currentView) {
        case "day":
          newDate.setDate(prevDate.getDate() + (direction === "prev" ? -1 : 1));
          break;
        case "week":
          newDate.setDate(prevDate.getDate() + (direction === "prev" ? -7 : 7));
          break;
        case "month":
          newDate.setMonth(
            prevDate.getMonth() + (direction === "prev" ? -1 : 1)
          );
          break;
      }
      return newDate;
    });
  };

  const getWeekDays = (): Date[] => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  };

  // --- VISTA DE DÍA ---
  const renderDayView = (): React.JSX.Element => {
    const dayEvents = events.filter((e) =>
      isSameDay(new Date(e.start), currentDate)
    );
    const hours = eachHourOfInterval({
      start: new Date(currentDate).setHours(0, 0, 0, 0),
      end: new Date(currentDate).setHours(23, 0, 0, 0),
    });

    return (
      <div className="border-t">
        {hours.map((hour, index) => {
          const hourEvents = dayEvents.filter((event) =>
            isWithinInterval(hour, {
              start: new Date(event.start),
              end: new Date(event.end),
            })
          );
          return (
            <div key={index} className="flex border-b min-h-[60px]">
              <div className="w-20 text-right pr-4 pt-2 text-sm text-muted-foreground">
                {format(hour, "HH:mm")}
              </div>
              <div className="flex-1 border-l p-2 space-y-2">
                {hourEvents.map((event) => (
                  <EventCard key={event.start.toString()} event={event} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- VISTA DE SEMANA ---
  const renderWeekView = (): React.JSX.Element => {
    const weekDays = getWeekDays();
    return (
      <div className="grid grid-cols-7 border-t border-l">
        {/* Encabezados de días de la semana */}
        {weekDays.map((day) => (
          <div
            key={`header-${day.toString()}`}
            className="p-3 text-center font-semibold border-b border-r bg-muted/50"
          >
            <p className="text-sm">{format(day, "EEE", { locale: es })}</p>
            <p className="text-lg">{format(day, "d")}</p>
          </div>
        ))}
        {/* Celdas de contenido de cada día */}
        {weekDays.map((day) => {
          const dayEvents = events.filter((e) =>
            isSameDay(new Date(e.start), day)
          );
          return (
            <div
              key={day.toString()}
              className="p-3 border-b border-r min-h-[582px]"
            >
              <div className="space-y-1">
                {dayEvents.map((event) => (
                  <EventCard key={event.start.toString()} event={event} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- VISTA DE MES ---
  const renderMonthView = (): React.JSX.Element => {
    const firstDay = startOfMonth(currentDate);
    const lastDay = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastDay });
    const startingDayIndex = getDay(firstDay) === 0 ? 6 : getDay(firstDay) - 1;

    return (
      <div className="grid grid-cols-7 border-t border-l">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
          <div
            key={day}
            className="p-3 text-center font-semibold border-b border-r bg-muted/50"
          >
            {day}
          </div>
        ))}
        {Array.from({ length: startingDayIndex }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="border-b border-r min-h-[120px]"
          ></div>
        ))}
        {daysInMonth.map((day) => {
          const dayEvents = events.filter((e) =>
            isSameDay(new Date(e.start), day)
          );
          return (
            <div
              key={day.toString()}
              className="p-3 border-b border-r min-h-[120px]"
            >
              <div className="font-bold text-sm">{format(day, "d")}</div>
              <div className="space-y-1 mt-1">
                {dayEvents.map((event) => (
                  <EventCard key={event.start.toString()} event={event} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Función para obtener el título dinámico según la vista
  const getViewTitle = (): string => {
    switch (currentView) {
      case "day":
        return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", {
          locale: es,
        });
      case "week":
        const weekDays = getWeekDays();
        const startWeek = weekDays[0];
        const endWeek = weekDays[6];
        return `${format(startWeek, "d MMM", { locale: es })} - ${format(endWeek, "d MMM yyyy", { locale: es })}`;
      case "month":
        return format(currentDate, "MMMM yyyy", { locale: es });
      default:
        return format(currentDate, "MMMM yyyy", { locale: es });
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case "day":
        return renderDayView();
      case "week":
        return renderWeekView();
      case "month":
        return renderMonthView();
      default:
        return renderMonthView();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start">
            <CardTitle className="text-xl capitalize">
              {getViewTitle()}
            </CardTitle>
            {currentView === "day" && (
              <p className="text-sm text-muted-foreground mt-1">Vista diaria</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Tabs
              value={currentView}
              onValueChange={(value) => setCurrentView(value as ViewType)}
            >
              <TabsList>
                <TabsTrigger value="day">
                  <List className="h-4 w-4 mr-2" />
                  Día
                </TabsTrigger>
                <TabsTrigger value="week">
                  <Grid className="h-4 w-4 mr-2" />
                  Semana
                </TabsTrigger>
                <TabsTrigger value="month">
                  <Square className="h-4 w-4 mr-2" />
                  Mes
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[750px] overflow-auto">
            <div className="p-6">{renderCurrentView()}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminCalendar;
