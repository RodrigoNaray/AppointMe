export interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  createdAt: string; // Las fechas llegan como strings en formato ISO
  updatedAt: string;
}

export interface CreateServiceDto {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
}

export interface UpdateServiceDto {
  name: string;
  description?: string;
  durationMinutes: string;
  price: number;
}