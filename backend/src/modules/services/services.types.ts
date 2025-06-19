export interface CreateServiceDto {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isActive?: boolean;
}

export interface UpdateServiceDto {
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  isActive?: boolean;
}