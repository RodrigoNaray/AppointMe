"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Category } from "@/types/service" 
import { ArrowUpDown, MoreHorizontal } from "lucide-react" 
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Columnas de DataTable para categorías
 * 
 * Mejores prácticas:
 * - TanStack Table v8 (react-table)
 * - Columnas con sorting (ArrowUpDown icon)
 * - DropdownMenu de shadcn-ui para acciones
 * - Badge para estado activo/inactivo
 * - Formateo de fechas con Intl.DateTimeFormat
 * 
 * Referencias:
 * - TanStack Table: https://tanstack.com/table/v8/docs/guide/introduction
 * - shadcn-ui DataTable: https://ui.shadcn.com/docs/components/data-table
 */

export type CategoryColumnActionsProps = {
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

export const createCategoryColumns = ({ 
  onEdit, 
  onDelete 
}: CategoryColumnActionsProps): ColumnDef<Category>[] => [
  {
    accessorKey: "name", 
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 sm:px-4"
        >
          <span className="text-xs sm:text-sm">Nombre</span>
          <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium text-xs sm:text-sm">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "description",
    header: () => <span className="text-xs sm:text-sm">Descripción</span>,
    cell: ({ row }) => {
      const description = row.getValue("description") as string | null;
      return (
        <div className="max-w-[150px] sm:max-w-[300px] truncate text-muted-foreground text-xs sm:text-sm">
          {description || "Sin descripción"}
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: () => <span className="text-xs sm:text-sm">Estado</span>,
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
          {isActive ? "Activa" : "Inactiva"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "_count",
    header: () => <div className="text-right text-xs sm:text-sm">Servicios</div>,
    cell: ({ row }) => {
      const count = row.original._count?.services || 0;
      return <div className="text-right font-medium text-xs sm:text-sm">{count}</div>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 sm:px-4"
        >
          <span className="text-xs sm:text-sm">Creada</span>
          <ArrowUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      const formatted = new Intl.DateTimeFormat("es-UY", {
        dateStyle: "short",
      }).format(date);
      return <div className="text-muted-foreground text-xs sm:text-sm">{formatted}</div>;
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right text-xs sm:text-sm">Acciones</div>,
    cell: ({ row }) => {
      const category = row.original;

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(category)} className="text-xs sm:text-sm">
                Editar Categoría
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(category.id)} 
                className="text-xs sm:text-sm text-red-500 focus:bg-red-50 focus:text-red-600"
                disabled={(category._count?.services ?? 0) > 0}
              >
                Borrar Categoría
              </DropdownMenuItem>
              {(category._count?.services ?? 0) > 0 && (
                <div className="px-2 py-1.5 text-[10px] sm:text-xs text-muted-foreground">
                  No se puede eliminar (tiene servicios)
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
