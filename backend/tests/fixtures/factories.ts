import { BASE_ADMIN, BASE_CATEGORY, BASE_SERVICE } from './mockData';

export const createCategoryInput = (overrides: Partial<{ name: string; description: string; isActive: boolean }> = {}) => ({
  name: 'Nueva categoria',
  description: 'Descripcion de prueba',
  isActive: true,
  ...overrides
});

export const createServiceInput = (
  overrides: Partial<{
    categoryId: string;
    name: string;
    description: string;
    durationMinutes: number;
    price: number;
    isActive: boolean;
  }> = {}
) => ({
  categoryId: BASE_CATEGORY.id,
  name: 'Servicio de prueba',
  description: 'Descripcion de servicio',
  durationMinutes: 45,
  price: 900,
  isActive: true,
  ...overrides
});

export const createAdminUser = (overrides: Partial<{ id: string; email: string }> = {}) => ({
  ...BASE_ADMIN,
  ...overrides
});

export const createServiceEntity = (overrides: Partial<typeof BASE_SERVICE> = {}) => ({
  ...BASE_SERVICE,
  ...overrides
});
