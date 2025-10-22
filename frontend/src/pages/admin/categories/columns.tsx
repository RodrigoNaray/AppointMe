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
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "description",
    header: "Descripción",
    cell: ({ row }) => {
      const description = row.getValue("description") as string | null;
      return (
        <div className="max-w-[300px] truncate text-muted-foreground">
          {description || "Sin descripción"}
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: "Estado",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Activa" : "Inactiva"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "_count",
    header: () => <div className="text-right">Servicios</div>,
    cell: ({ row }) => {
      const count = row.original._count?.services || 0;
      return <div className="text-right font-medium">{count}</div>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Creada
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      const formatted = new Intl.DateTimeFormat("es-UY", {
        dateStyle: "medium",
      }).format(date);
      return <div className="text-muted-foreground">{formatted}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const category = row.original;

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
              <DropdownMenuItem onClick={() => onEdit(category)}>
                Editar Categoría
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(category.id)} 
                className="text-red-500 focus:bg-red-50 focus:text-red-600"
                disabled={(category._count?.services ?? 0) > 0}
              >
                Borrar Categoría
              </DropdownMenuItem>
              {category._count?.services && category._count.services > 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
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
