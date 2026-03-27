import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

type AdminAuthRequest = Request & {
  user?: { id: string };
};

vi.mock('../../../../../src/modules/availability/admin/availability.admin.services', () => {
  class AvailabilityValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AvailabilityValidationError';
    }
  }

  return {
    AvailabilityValidationError,
    getSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    getBlocks: vi.fn(),
    createBlock: vi.fn(),
    deleteBlock: vi.fn(),
    getCalendarEvents: vi.fn()
  };
});

import router from '../../../../../src/modules/availability/admin/availability.admin.routes';
import * as availabilityService from '../../../../../src/modules/availability/admin/availability.admin.services';

const mockedService = vi.mocked(availabilityService);
type AdminSchedule = Awaited<ReturnType<typeof availabilityService.getSchedule>>;

describe('availability.admin.routes', () => {
  const app = express();
  app.use(express.json());
  app.use(
    '/availability-admin',
    (req: Request, _res: Response, next: NextFunction) => {
      (req as AdminAuthRequest).user = { id: 'admin-1' };
      next();
    },
    router
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns schedule for authenticated admin', async () => {
    mockedService.getSchedule.mockResolvedValue(
      { monday: { isActive: true, start: '09:00', end: '17:00' } } as unknown as AdminSchedule
    );

    const response = await request(app).get('/availability-admin/schedule');

    expect(response.status).toBe(200);
    expect(mockedService.getSchedule).toHaveBeenCalledWith('admin-1');
  });

  it('returns 400 when updateSchedule throws validation error', async () => {
    mockedService.updateSchedule.mockRejectedValue(
      new availabilityService.AvailabilityValidationError('bad schedule')
    );

    const response = await request(app)
      .put('/availability-admin/schedule')
      .send({ monday: { isActive: true, start: '11:00', end: '09:00' } });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('bad schedule');
  });

  it('returns 400 when creating block with invalid date payload', async () => {
    const response = await request(app)
      .post('/availability-admin/blocks')
      .send({ startTime: 'invalid-date', endTime: '2030-01-01T10:00:00.000Z' });

    expect(response.status).toBe(400);
    expect(mockedService.createBlock).not.toHaveBeenCalled();
  });

  it('returns 404 when deleting unknown block', async () => {
    mockedService.deleteBlock.mockRejectedValue(
      new availabilityService.AvailabilityValidationError('not found')
    );

    const response = await request(app).delete('/availability-admin/blocks/block-1');

    expect(response.status).toBe(404);
  });

  it('validates month format in calendar endpoint', async () => {
    const response = await request(app).get('/availability-admin/calendar').query({ month: '2030/01' });

    expect(response.status).toBe(400);
  });

  it('parses valid month and delegates to service', async () => {
    mockedService.getCalendarEvents.mockResolvedValue([]);

    const response = await request(app).get('/availability-admin/calendar').query({ month: '2030-01' });

    expect(response.status).toBe(200);

    const calledMonth = mockedService.getCalendarEvents.mock.calls[0][1];
    expect(calledMonth.toISOString()).toBe('2030-01-01T00:00:00.000Z');
  });
});
