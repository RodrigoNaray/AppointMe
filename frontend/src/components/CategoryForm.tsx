import { useState, FormEvent, useEffect } from 'react';
import { Category } from '@/types/service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

/**
 * CategoryForm - Formulario para crear/editar categorías
 * 
 * Mejores prácticas:
 * - shadcn-ui components (Input, Textarea, Switch, Button, Label)
 * - useState para estado local del formulario
 * - useEffect para poblar datos en modo edición
 * - Validación HTML5 (required, minlength)
 * - Controlled components (React best practices)
 * 
 * Props:
 * - onSubmit: Callback al enviar el formulario
 * - onCancel: Callback al cancelar
 * - initialData: Datos iniciales para modo edición (opcional)
 * 
 * Referencias:
 * - React Forms: https://react.dev/reference/react-dom/components/form
 * - shadcn-ui Form: https://ui.shadcn.com/docs/components/form
 */

interface CategoryFormProps {
  onSubmit: (data: CategoryFormData) => void;
  onCancel: () => void;
  initialData?: Category | null;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  isActive: boolean;
}

export default function CategoryForm({ 
  onSubmit, 
  onCancel, 
  initialData 
}: CategoryFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Poblar formulario con datos iniciales (modo edición)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setIsActive(initialData.isActive);
    } else {
      // Reset al crear nueva categoría
      setName('');
      setDescription('');
      setIsActive(true);
    }
  }, [initialData]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!name.trim()) {
      return;
    }

    onSubmit({ 
      name: name.trim(), 
      description: description.trim() || undefined,
      isActive 
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Campo Nombre */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Nombre de la categoría <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Cortes, Barba, Coloración"
          required
          minLength={2}
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground">
          Nombre único para identificar la categoría (2-50 caracteres)
        </p>
      </div>

      {/* Campo Descripción */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          placeholder="Descripción breve de los servicios incluidos en esta categoría"
          rows={3}
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          Máximo 200 caracteres
        </p>
      </div>

      {/* Switch Estado Activo */}
      <div className="flex items-center space-x-3">
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Categoría activa
        </Label>
      </div>
      <p className="text-xs text-muted-foreground pl-12">
        Las categorías inactivas no se mostrarán en la página pública
      </p>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" onClick={onCancel} variant="outline">
          Cancelar
        </Button>
        <Button type="submit">
          {initialData ? 'Guardar Cambios' : 'Crear Categoría'}
        </Button>
      </div>
    </form>
  );
}
