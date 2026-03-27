import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError } from '../../../../src/utils/error';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    service: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    category: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock('../../../../src/config/prisma', () => ({
  default: mockPrisma
}));

import {
  createService,
  updateService,
  deleteService,
  ServiceValidationError
} from '../../../../src/modules/services/services.services';

describe('services.services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws ServiceValidationError when duration is not positive', async () => {
    await expect(
      createService(
        {
          name: 'Corte',
          categoryId: 'cat-1',
          durationMinutes: 0,
          price: 500
        },
        'admin-1'
      )
    ).rejects.toBeInstanceOf(ServiceValidationError);
  });

  it('throws ConflictError when category is inactive', async () => {
    mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Inactiva', isActive: false });

    await expect(
      createService(
        {
          name: 'Corte',
          categoryId: 'cat-1',
          durationMinutes: 30,
          price: 500
        },
        'admin-1'
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws ConflictError when service name already exists', async () => {
    mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Cortes', isActive: true });
    mockPrisma.service.findFirst.mockResolvedValue({ id: 'service-1', name: 'Corte clasico' });

    await expect(
      createService(
        {
          name: 'Corte clasico',
          categoryId: 'cat-1',
          durationMinutes: 30,
          price: 500
        },
        'admin-1'
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws NotFoundError when updating an unknown service', async () => {
    mockPrisma.service.findUnique.mockResolvedValue(null);

    await expect(
      updateService('missing', { name: 'Nuevo nombre' })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deletes a service when it exists', async () => {
    mockPrisma.service.findUnique.mockResolvedValue({ id: 'service-1', category: {} });
    mockPrisma.service.delete.mockResolvedValue({ id: 'service-1' });

    await deleteService('service-1');

    expect(mockPrisma.service.delete).toHaveBeenCalledWith({ where: { id: 'service-1' } });
  });
});
