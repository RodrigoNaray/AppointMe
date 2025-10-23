"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
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
    <div className={`p-0.5 sm:p-1 rounded text-[8px] sm:text-xs border ${getEventColor(event.type)}`}>
      <p className="font-semibold truncate leading-tight">{event.title}</p>
      <p className="text-[7px] sm:text-xs opacity-80 leading-tight">
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
            <div key={index} className="flex border-b min-h-[50px] sm:min-h-[60px]">
              <div className="w-12 sm:w-20 text-right pr-2 sm:pr-4 pt-2 text-[10px] sm:text-sm text-muted-foreground">
                {format(hour, "HH:mm")}
              </div>
              <div className="flex-1 border-l p-1 sm:p-2 space-y-1 sm:space-y-2">
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
            className="p-1 sm:p-3 text-center font-semibold border-b border-r bg-muted/50"
          >
            <p className="text-[10px] sm:text-sm">{format(day, "EEEEE", { locale: es })}</p>
            <p className="text-sm sm:text-lg">{format(day, "d")}</p>
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
              className="p-1 sm:p-3 border-b border-r min-h-[400px] sm:min-h-[582px]"
            >
              <div className="space-y-0.5 sm:space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <EventCard key={event.start.toString()} event={event} />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[8px] sm:text-[10px] text-muted-foreground text-center">
                    +{dayEvents.length - 3}
                  </div>
                )}
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
        {["L", "M", "X", "J", "V", "S", "D"].map((day, index) => (
          <div
            key={day}
            className="p-1 sm:p-3 text-center font-semibold border-b border-r bg-muted/50 text-[10px] sm:text-sm"
          >
            <span className="sm:hidden">{day}</span>
            <span className="hidden sm:inline">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][index]}</span>
          </div>
        ))}
        {Array.from({ length: startingDayIndex }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="border-b border-r min-h-[80px] sm:min-h-[120px]"
          ></div>
        ))}
        {daysInMonth.map((day) => {
          const dayEvents = events.filter((e) =>
            isSameDay(new Date(e.start), day)
          );
          return (
            <div
              key={day.toString()}
              className="p-1 sm:p-3 border-b border-r min-h-[80px] sm:min-h-[120px]"
            >
              <div className="font-bold text-[10px] sm:text-sm">{format(day, "d")}</div>
              <div className="space-y-0.5 sm:space-y-1 mt-0.5 sm:mt-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <EventCard key={event.start.toString()} event={event} />
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[8px] sm:text-[10px] text-muted-foreground">
                    +{dayEvents.length - 2} más
                  </div>
                )}
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
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:gap-4 p-4 sm:p-6">
          {/* Título */}
          <div className="flex flex-col items-center sm:items-start">
            <CardTitle className="text-lg sm:text-xl capitalize text-center sm:text-left">
              {getViewTitle()}
            </CardTitle>
            {currentView === "day" && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Vista diaria</p>
            )}
          </div>
          
          {/* Controles - Stack en mobile, row en desktop */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            {/* Tabs de vista */}
            <Tabs
              value={currentView}
              onValueChange={(value) => setCurrentView(value as ViewType)}
              className="w-full sm:w-auto"
            >
              <TabsList className="w-full sm:w-auto grid grid-cols-3">
                <TabsTrigger value="day" className="text-xs sm:text-sm">
                  <List className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Día</span>
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs sm:text-sm">
                  <Grid className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Semana</span>
                </TabsTrigger>
                <TabsTrigger value="month" className="text-xs sm:text-sm">
                  <Square className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Mes</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Navegación */}
            <div className="flex items-center justify-center gap-2 w-full sm:w-auto sm:ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("prev")}
                className="flex-1 sm:flex-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="flex-1 sm:flex-none text-xs sm:text-sm"
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("next")}
                className="flex-1 sm:flex-none"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[600px] sm:h-[750px] overflow-auto">
            <div className="p-3 sm:p-6">{renderCurrentView()}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminCalendar;
