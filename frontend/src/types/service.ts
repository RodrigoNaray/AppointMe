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