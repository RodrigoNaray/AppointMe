"use client"

import { DataTable } from "@/components/shared/DataTable";
import { columns, Booking } from "./columns"


const sampleData: Booking[] = [
  {
    id: "1",
    clientName: "Ana García",
    serviceName: "Maquillaje Social de Noche",
    bookingTime: "2025-07-20 19:00",
    status: "Confirmada",
  },
  {
    id: "2",
    clientName: "Lucía Fernández",
    serviceName: "Corte y Peinado",
    bookingTime: "2025-07-21 11:30",
    status: "Confirmada",
  },
];

export default function BookingsPage() {
  return (
    <div className="w-full">
       <h1 className="text-3xl font-bold mb-6">Reservas</h1>
       <DataTable columns={columns} data={sampleData} />
    </div>
  )
}