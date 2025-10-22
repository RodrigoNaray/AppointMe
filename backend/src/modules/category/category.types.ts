/**
 * DTO para crear una nueva categoría
 * 
 * @property name - Nombre único de la categoría (ej: "Cortes", "Barba")
 * @property description - Descripción opcional de la categoría
 * @property isActive - Si la categoría está activa (por defecto true)
 */
export interface CreateCategoryDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

/**
 * DTO para actualizar una categoría existente
 * Todos los campos son opcionales para permitir actualizaciones parciales
 */
export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}
