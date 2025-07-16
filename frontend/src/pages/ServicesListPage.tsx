"use client"

import { useEffect, useState } from 'react';
import apiClient from '@/api/client';
import { Service } from '@/types/service'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function ServicesListPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await apiClient.get<Service[]>('api/services');
        
        setServices(response.data.filter(s => s.isActive));
      } catch (err) {
        setError('No se pudieron cargar los servicios en este momento.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, []);

  if (isLoading) return <p>Cargando nuestros servicios...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Nuestros Servicios</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Elige el servicio perfecto para ti y agenda tu cita en pocos clics.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{service.name}</CardTitle>
              <CardDescription>{service.durationMinutes} min / ${new Intl.NumberFormat("es-UY").format(service.price)}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground">
                {service.description}
              </p>
            </CardContent>
            <div className="p-6 pt-0">
                <Link to={`/book/${service.id}`}> 
                    <Button className="w-full">Reservar Ahora</Button>
                </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}