import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { ConflictError, NotFoundError } from '../../../../src/utils/error';

type AdminAuthRequest = Request & {
  user?: { id: string };
};

vi.mock('../../../../src/middlewares/isAdminAuthenticated', () => ({
  isAdminAuthenticated: (req: Request, _res: Response, next: NextFunction) => {
    (req as AdminAuthRequest).user = { id: 'admin-1' };
    next();
  }
}));

vi.mock('../../../../src/modules/category/category.services', () => ({
  getPublicCategories: vi.fn(),
  getAllCategories: vi.fn(),
  getCategoryById: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn()
}));

import router from '../../../../src/modules/category/category.routes';
import * as categoryServices from '../../../../src/modules/category/category.services';
import { createTestApp } from '../../../fixtures/testHelpers';

const mockedService = vi.mocked(categoryServices);
type PublicCategoryList = Awaited<ReturnType<typeof categoryServices.getPublicCategories>>;
type AdminCategoryList = Awaited<ReturnType<typeof categoryServices.getAllCategories>>;

describe('category.routes', () => {
  const app = createTestApp('/categories', router);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns public categories in GET /categories', async () => {
    mockedService.getPublicCategories.mockResolvedValue(
      [{ id: 'cat-1', name: 'Cortes' }] as unknown as PublicCategoryList
    );

    const response = await request(app).get('/categories');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('returns all categories in GET /categories/admin', async () => {
    mockedService.getAllCategories.mockResolvedValue(
      [{ id: 'cat-1', name: 'Cortes' }] as unknown as AdminCategoryList
    );

    const response = await request(app).get('/categories/admin');

    expect(response.status).toBe(200);
    expect(mockedService.getAllCategories).toHaveBeenCalledTimes(1);
  });

  it('returns 409 when createCategory raises ConflictError', async () => {
    mockedService.createCategory.mockRejectedValue(new ConflictError('duplicated'));

    const response = await request(app)
      .post('/categories/admin')
      .send({ name: 'Cortes' });

    expect(response.status).toBe(409);
    expect(response.body.message).toContain('duplicated');
  });

  it('returns 404 when category is not found', async () => {
    mockedService.getCategoryById.mockRejectedValue(new NotFoundError('missing'));

    const response = await request(app).get('/categories/admin/missing');

    expect(response.status).toBe(404);
  });

  it('returns 204 in successful delete', async () => {
    mockedService.deleteCategory.mockResolvedValue(undefined);

    const response = await request(app).delete('/categories/admin/cat-1');

    expect(response.status).toBe(204);
  });
});
