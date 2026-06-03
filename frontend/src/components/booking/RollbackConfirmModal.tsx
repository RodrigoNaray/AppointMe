import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";

export interface RollbackItem {
  serviceId: string;
  serviceName: string;
  success: boolean;
  bookingId?: string;
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  successfulItems: RollbackItem[];
  failedItems: RollbackItem[];
  onRollback: () => Promise<void>;
  onKeepPartial: () => void;
}

export function RollbackConfirmModal({
  open,
  onOpenChange,
  successfulItems,
  failedItems,
  onRollback,
  onKeepPartial,
}: Props) {
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackDone, setRollbackDone] = useState(false);

  const handleRollback = async () => {
    setIsRollingBack(true);
    await onRollback();
    setIsRollingBack(false);
    setRollbackDone(true);
  };

  const handleClose = () => {
    setRollbackDone(false);
    onOpenChange(false);
    if (!rollbackDone) {
      onKeepPartial();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="w-5 h-5" />
            Reserva parcial
          </DialogTitle>
          <DialogDescription>
            {successfulItems.length} de {successfulItems.length + failedItems.length} servicios se reservaron correctamente.
            {failedItems.length} fallaron.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {successfulItems.length > 0 && (
            <div>
              <p className="text-sm font-medium text-green-700 mb-1">Reservados correctamente:</p>
              <ul className="space-y-1">
                {successfulItems.map((item) => (
                  <li key={item.serviceId} className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {item.serviceName}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {failedItems.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-700 mb-1">Fallaron:</p>
              <ul className="space-y-1">
                {failedItems.map((item) => (
                  <li key={item.serviceId} className="flex items-start gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {item.serviceName}
                      {item.error && <span className="text-red-500"> — {item.error}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {!rollbackDone ? (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isRollingBack}
              className="sm:flex-1"
            >
              Cerrar
            </Button>
            <Button
              variant="default"
              onClick={handleRollback}
              disabled={isRollingBack}
              className="sm:flex-1"
            >
              {isRollingBack ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Sí, cancelar y reintentar
                </>
              )}
            </Button>
          </DialogFooter>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Reservas canceladas correctamente. Podés reintentar cuando quieras.
            </div>
            <Button variant="outline" onClick={() => { setRollbackDone(false); onOpenChange(false); }} className="w-full">
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
