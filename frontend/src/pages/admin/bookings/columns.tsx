"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { XCircle, CalendarClock } from "lucide-react"

export type Booking = {
  id: string
  clientName: string
  serviceName: string
  bookingTime: string
  status: "Confirmada" | "Cancelada" | "Finalizada"
}

export type BookingActions = {
  onCancel: (id: string) => void
  onReschedule: (id: string) => void
}

export const getColumns = (actions: BookingActions): ColumnDef<Booking>[] => [
  {
    accessorKey: "clientName",
    header: "Cliente",
  },
  {
    accessorKey: "serviceName",
    header: "Servicio",
  },
  {
    accessorKey: "bookingTime",
    header: "Fecha y Hora",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.original.status;
      const variant =
        status === "Cancelada"
          ? "destructive"
          : status === "Finalizada"
            ? "secondary"
            : "default";
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => {
      const booking = row.original
      if (booking.status !== "Confirmada") {
        return <span className="text-xs text-muted-foreground">-</span>
      }
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.onReschedule(booking.id)}
            className="h-8 px-2 text-xs"
          >
            <CalendarClock className="h-3.5 w-3.5 mr-1" />
            Reprogramar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.onCancel(booking.id)}
            className="h-8 px-2 text-xs text-destructive hover:text-destructive"
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Cancelar
          </Button>
        </div>
      )
    },
  },
]
