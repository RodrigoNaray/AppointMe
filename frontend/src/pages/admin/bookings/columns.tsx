
"use client"

import { ColumnDef } from "@tanstack/react-table"

export type Booking = {
  id: string
  clientName: string
  serviceName: string
  bookingTime: string
  status: "Confirmada" | "Completada" | "Cancelada"
}

export const columns: ColumnDef<Booking>[] = [
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
  },
]