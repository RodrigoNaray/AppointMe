// frontend/src/components/ServiceForm.tsx
import { useState, FormEvent, useEffect } from 'react';
import { CreateServiceDto, UpdateServiceDto, Service } from '../types/service';

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

  // useEffect para poblar el formulario si recibimos datos iniciales
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setDuration(initialData.durationMinutes);
      setPrice(initialData.price);
    }
  }, [initialData]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description, durationMinutes: Number(durationMinutes), price: Number(price) });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Input para el Nombre */}
      <div className="mb-4">
        <label htmlFor="name" className="block text-gray-700 mb-2">Nombre del Servicio</label>
        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
      </div>
      
      {/* Input para la Descripción */}
      <div className="mb-4">
        <label htmlFor="description" className="block text-gray-700 mb-2">Descripción</label>
        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
      </div>

      {/* Inputs para Duración y Precio */}
      <div className="flex gap-4 mb-4">
        <div className='w-1/2'>
          <label htmlFor="duration" className="block text-gray-700 mb-2">Duración (min)</label>
          <input type="number" id="duration" value={durationMinutes} onChange={(e) => setDuration(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" required />
        </div>
        <div className='w-1/2'>
          <label htmlFor="price" className="block text-gray-700 mb-2">Precio</label>
          <input type="number" id="price" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" required />
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200">Cancelar</button>
        <button type="submit" className="px-4 py-2 rounded-lg text-white bg-gray-800 hover:bg-gray-900">Guardar Cambios</button>
      </div>
    </form>
  );
}