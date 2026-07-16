/**
 * DTO para crear un nuevo servicio
 * 
 * @property categoryId - ID de la categoría a la que pertenece el servicio (requerido)
 * @property name - Nombre único del servicio
 * @property description - Descripción opcional del servicio
 * @property durationMinutes - Duración en minutos (debe ser > 0)
 * @property price - Precio del servicio (debe ser >= 0)
 * @property isActive - Si el servicio está activo (por defecto true)
 */
export interface CreateServiceDto {
  categoryId: string; // AGREGADO: Requerido para crear servicio
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isActive?: boolean;
}

/**
 * DTO para actualizar un servicio existente
 * Todos los campos son opcionales para permitir actualizaciones parciales
 */
export interface UpdateServiceDto {
  categoryId?: string; // AGREGADO: Permitir cambiar categoría
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  isActive?: boolean;
}

export interface GetServicesQuery {
  page?: string;
  limit?: string;
  categoryId?: string;
}

export interface PaginatedServicesResponse {
  success: boolean;
  services: Record<string, unknown>[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}