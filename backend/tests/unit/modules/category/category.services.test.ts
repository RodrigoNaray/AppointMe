import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError } from '../../../../src/utils/error';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    service: {
      count: vi.fn()
    }
  }
}));

vi.mock('../../../../src/config/prisma', () => ({
  default: mockPrisma
}));

import {
  getPublicCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../../../../src/modules/category/category.services';

describe('category.services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries only active categories with active services for public endpoint', async () => {
    mockPrisma.category.findMany.mockResolvedValue([]);

    await getPublicCategories();

    expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          services: { some: { isActive: true } }
        }
      })
    );
  });

  it('throws NotFoundError when category does not exist', async () => {
    mockPrisma.category.findUnique.mockResolvedValue(null);

    await expect(getCategoryById('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ConflictError when creating category with duplicated name', async () => {
    mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Cortes' });

    await expect(
      createCategory({ name: 'Cortes', description: 'desc' })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws ConflictError when updating category with name already used by another category', async () => {
    mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Original' });
    mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat-2', name: 'Duplicada' });

    await expect(
      updateCategory('cat-1', { name: 'Duplicada' })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws ConflictError when deleting category with services associated', async () => {
    mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Cortes' });
    mockPrisma.service.count.mockResolvedValue(2);

    await expect(deleteCategory('cat-1')).rejects.toBeInstanceOf(ConflictError);
    expect(mockPrisma.category.delete).not.toHaveBeenCalled();
  });
});
