import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/modules/health/health.services', () => ({
  getStatus: vi.fn()
}));

import router from '../../../../src/modules/health/health.routes';
import * as healthServices from '../../../../src/modules/health/health.services';
import { createTestApp } from '../../../fixtures/testHelpers';

const mockedService = vi.mocked(healthServices);

describe('health.routes', () => {
  const app = createTestApp('/health', router);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 and health payload', async () => {
    mockedService.getStatus.mockResolvedValue({
      uptime: 12,
      timestamp: '2030-01-01T00:00:00.000Z',
      db: { status: 'ok' }
    });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.db.status).toBe('ok');
  });

  it('returns 500 when service throws', async () => {
    mockedService.getStatus.mockRejectedValue(new Error('unexpected'));

    const response = await request(app).get('/health');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Error interno del servidor');
  });
});
