import type { AdminUser, ClientUser } from '@/types/auth';
import type { Category, Service } from '@/types/service';

export const MOCK_CATEGORY: Category = {
  id: 'cat-1',
  name: 'Cortes',
  description: 'Categoria de cortes',
  isActive: true,
  createdAt: '2030-01-01T00:00:00.000Z',
  updatedAt: '2030-01-01T00:00:00.000Z',
};

export const createMockService = (overrides: Partial<Service> = {}): Service => ({
  id: 'service-1',
  name: 'Corte clasico',
  description: 'Servicio de prueba',
  durationMinutes: 30,
  price: 500,
  isActive: true,
  categoryId: MOCK_CATEGORY.id,
  category: MOCK_CATEGORY,
  createdAt: '2030-01-01T00:00:00.000Z',
  updatedAt: '2030-01-01T00:00:00.000Z',
  ...overrides,
});

export const createMockClientUser = (overrides: Partial<ClientUser> = {}): ClientUser => ({
  id: 'client-1',
  name: 'Ana',
  email: 'ana@example.com',
  phone: '099123456',
  type: 'client',
  ...overrides,
});

export const createMockAdminUser = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: 'admin-1',
  email: 'admin@example.com',
  type: 'admin',
  ...overrides,
});