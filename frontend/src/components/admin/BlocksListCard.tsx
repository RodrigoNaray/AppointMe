"use client";

import type { AvailabilityBlock } from "@/types/availability";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";

interface BlocksListCardProps {
  blocks: AvailabilityBlock[];
  onAdd: () => void;
  onDelete: (blockId: string) => void;
}

export default function BlocksListCard({
  blocks,
  onAdd,
  onDelete,
}: BlocksListCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bloqueos de Tiempo</CardTitle>
        <CardDescription>
          Añade bloqueos específicos para vacaciones, citas personales o
          cualquier momento en que no estarás disponible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {blocks.length > 0 ? (
            blocks.map((block) => (
              <div
                key={block.id}
                className="flex justify-between items-center p-3 rounded-md bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {block.reason || "Bloqueo sin motivo"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(
                      new Date(block.startTime),
                      "d 'de' MMMM, HH:mm",
                      { locale: es }
                    )}{" "}
                    -{" "}
                    {format(new Date(block.endTime), "HH:mm'hs'", {
                      locale: es,
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive shrink-0 ml-2"
                  onClick={() => onDelete(block.id)}
                >
                  Eliminar
                </Button>
              </div>
            ))
          ) : (
            <EmptyState
              icon={Calendar}
              title="Sin bloques de tiempo"
              description="Agregá un bloque cuando no estés disponible."
              actionLabel="Agregar bloque"
              onAction={onAdd}
            />
          )}
        </div>
        <Button variant="outline" className="mt-4" onClick={onAdd}>
          Añadir Bloqueo
        </Button>
      </CardContent>
    </Card>
  );
}
