// frontend/src/components/ServiceForm.tsx
import { useState, FormEvent, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CreateServiceDto, UpdateServiceDto, Service, Category } from '../types/service';
import apiClient from '@/api/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface ServiceFormProps {
  onSubmit: (data: CreateServiceDto | UpdateServiceDto) => void;
  onCancel: () => void;
  initialData?: Service | null; // Aceptamos datos iniciales opcionales
}

export default function ServiceForm({ onSubmit, onCancel, initialData }: ServiceFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDuration] = useState(60);
  const [price, setPrice] = useState(1000);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Fetch categorías activas
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get<Category[]>('categories/admin');
        setCategories(response.data.filter((cat) => cat.isActive));
      } catch (err) {
        console.error('Error al cargar categorías:', err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // useEffect para poblar el formulario si recibimos datos iniciales
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setDuration(initialData.durationMinutes);
      setPrice(initialData.price);
      setCategoryId(initialData.categoryId);
    }
  }, [initialData]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      toast.error('Por favor selecciona una categoría');
      return;
    }
    onSubmit({ 
      categoryId,
      name, 
      description, 
      durationMinutes: Number(durationMinutes), 
      price: Number(price) 
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selector de Categoría */}
      <div className="space-y-2">
        <Label htmlFor="category">Categoría *</Label>
        <Select value={categoryId} onValueChange={setCategoryId} disabled={loadingCategories}>
          <SelectTrigger id="category">
            <SelectValue placeholder={loadingCategories ? "Cargando..." : "Selecciona una categoría"} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Input para el Nombre */}
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del Servicio *</Label>
        <Input 
          type="text" 
          id="name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          required 
        />
      </div>
      
      {/* Input para la Descripción */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea 
          id="description" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          rows={3}
        />
      </div>

      {/* Inputs para Duración y Precio */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Duración (min) *</Label>
          <Input 
            type="number" 
            id="duration" 
            value={durationMinutes} 
            onChange={(e) => setDuration(Number(e.target.value))} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Precio *</Label>
          <Input 
            type="number" 
            id="price" 
            value={price} 
            onChange={(e) => setPrice(Number(e.target.value))} 
            required 
          />
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" onClick={onCancel} variant="outline">
          Cancelar
        </Button>
        <Button type="submit">
          Guardar Cambios
        </Button>
      </div>
    </form>
  );
}