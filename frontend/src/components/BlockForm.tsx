import { useState, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface BlockFormProps {
  onSubmit: (data: { startTime: string; endTime: string; reason: string }) => void;
  onCancel: () => void;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

export default function BlockForm({ onSubmit, onCancel, defaultStartTime, defaultEndTime }: BlockFormProps) {
  const now = new Date();
  const defaultStart = defaultStartTime || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  const defaultEnd = defaultEndTime || `${later.getFullYear()}-${String(later.getMonth() + 1).padStart(2, '0')}-${String(later.getDate()).padStart(2, '0')}T${String(later.getHours()).padStart(2, '0')}:${String(later.getMinutes()).padStart(2, '0')}`;

  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [reason, setReason] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (new Date(endTime) < new Date(startTime)) {
      toast.error("La fecha de fin no puede ser anterior a la fecha de inicio.");
      return;
    }
    onSubmit({ startTime, endTime, reason });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Inicio del bloqueo</Label>
          <Input
            id="startTime"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">Fin del bloqueo</Label>
          <Input
            id="endTime"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reason">Motivo (opcional)</Label>
        <Input
          id="reason"
          type="text"
          placeholder="Ej: Vacaciones, Cita médica"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar Bloqueo</Button>
      </div>
    </form>
  );
}