import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../../../../src/utils/error';

type AdminAuthRequest = Request & {
  user?: { id: string };
};

vi.mock('../../../../src/middlewares/isAdminAuthenticated', () => ({
  isAdminAuthenticated: (req: Request, _res: Response, next: NextFunction) => {
    (req as AdminAuthRequest).user = { id: 'admin-1' };
    next();
  }
}));

vi.mock('../../../../src/modules/services/services.services', () => {
  class ServiceValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ServiceValidationError';
    }
  }

  return {
    ServiceValidationError,
    getAllServices: vi.fn(),
    createService: vi.fn(),
    updateService: vi.fn(),
    deleteService: vi.fn()
  };
});

import router from '../../../../src/modules/services/services.routes';
import * as servicesService from '../../../../src/modules/services/services.services';
import { createTestApp } from '../../../fixtures/testHelpers';

const mockedService = vi.mocked(servicesService);
type ServiceList = Awaited<ReturnType<typeof servicesService.getAllServices>>;
type CreatedService = Awaited<ReturnType<typeof servicesService.createService>>;

describe('services.routes', () => {
  const app = createTestApp('/services', router);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all services in GET /services', async () => {
    mockedService.getAllServices.mockResolvedValue(
      [{ id: 'service-1', name: 'Corte' }] as unknown as ServiceList
    );

    const response = await request(app).get('/services');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('creates service in POST /services with admin user from middleware', async () => {
    mockedService.createService.mockResolvedValue(
      { id: 'service-1', name: 'Corte' } as unknown as CreatedService
    );

    const payload = {
      categoryId: 'cat-1',
      name: 'Corte',
      durationMinutes: 30,
      price: 500
    };

    const response = await request(app).post('/services').send(payload);

    expect(response.status).toBe(201);
    expect(mockedService.createService).toHaveBeenCalledWith(payload, 'admin-1');
  });

  it('returns 400 when service validation fails', async () => {
    mockedService.createService.mockRejectedValue(
      new servicesService.ServiceValidationError('invalid payload')
    );

    const response = await request(app)
      .post('/services')
      .send({ name: 'Bad', durationMinutes: -1, price: 100, categoryId: 'cat-1' });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('invalid payload');
  });

  it('returns 404 when update receives unknown service id', async () => {
    mockedService.updateService.mockRejectedValue(new NotFoundError('not found'));

    const response = await request(app)
      .put('/services/update/missing')
      .send({ name: 'Nuevo' });

    expect(response.status).toBe(404);
  });

  it('returns 204 in successful delete', async () => {
    mockedService.deleteService.mockResolvedValue(undefined);

    const response = await request(app).delete('/services/remove/service-1');

    expect(response.status).toBe(204);
  });
});
