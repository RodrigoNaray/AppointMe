/**
 * Interfaz para Categoría de Servicios
 * Corresponde al modelo Category del backend
 */
export interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    services: number; // Conteo de servicios (incluido en algunas responses)
  };
}

/**
 * Interfaz para Servicio con categoría incluida
 * Corresponde al modelo Service del backend con relación category
 */
export interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  categoryId: string; // AGREGADO: ID de la categoría
  category: Category; // AGREGADO: Objeto categoría completo
  createdAt: string; // Las fechas llegan como strings en formato ISO
  updatedAt: string;
}

/**
 * DTO para crear un nuevo servicio (admin)
 */
export interface CreateServiceDto {
  categoryId: string; // AGREGADO: Requerido al crear servicio
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
}

/**
 * DTO para actualizar un servicio existente (admin)
 */
export interface UpdateServiceDto {
  categoryId?: string; // AGREGADO: Opcional para cambiar categoría
  name: string;
  description?: string;
  durationMinutes: string;
  price: number;
}

/**
 * DTO para crear una nueva categoría (admin)
 */
export interface CreateCategoryDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

/**
 * DTO para actualizar una categoría existente (admin)
 */
export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface PaginationResponse {
  current_page: number;
  total_pages: number;
  total_count: number;
  per_page: number;
}

export interface PaginatedServicesResult {
  success: boolean;
  services: Service[];
  pagination: PaginationResponse;
}