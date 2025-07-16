"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Service } from "@/types/service" 
import { ArrowUpDown, MoreHorizontal } from "lucide-react" 

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


export type ServiceColumnActionsProps = {
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
}

export const createServiceColumns = ({ onEdit, onDelete }: ServiceColumnActionsProps): ColumnDef<Service>[] => [
  {
    accessorKey: "name", 
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "durationMinutes",
    header: "Duración (min)",
  },
  {
    accessorKey: "price",
    header: () => <div className="text-right">Precio</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("price"))
      const formatted = new Intl.NumberFormat("es-UY", {
        style: "currency",
        currency: "UYU",
      }).format(amount)

      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  
  {
    id: "actions",
    cell: ({ row }) => {
      const service = row.original 

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(service)}>
                Editar Servicio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(service.id)} className="text-red-500 focus:bg-red-50 focus:text-red-600">
                Borrar Servicio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]