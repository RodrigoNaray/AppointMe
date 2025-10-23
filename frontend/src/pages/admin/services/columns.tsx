"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Service } from "@/types/service" 
import { ArrowUpDown, MoreHorizontal, Tag } from "lucide-react" 

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
          className="h-8 px-2"
        >
          Nombre
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium text-sm px-2">{row.getValue("name")}</div>,
    size: 200,
  },
  {
    accessorKey: "category",
    header: "Categoría",
    cell: ({ row }) => {
      const category = row.original.category;
      return (
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-1">
            <Tag className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium">
              {category?.name || 'Sin categoría'}
            </span>
          </div>
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: "durationMinutes",
    header: "Duración",
    cell: ({ row }) => <div className="text-sm">{row.getValue("durationMinutes")} min</div>,
    size: 100,
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

      return <div className="text-right font-medium text-sm">{formatted}</div>
    },
    size: 120,
  },
  
  {
    id: "actions",
    header: () => <div className="text-right">Acciones</div>,
    cell: ({ row }) => {
      const service = row.original 

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-3.5 w-3.5" />
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
    size: 80,
  },
]