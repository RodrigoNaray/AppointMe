import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../src/modules/availability/public/availability.public.services', () => ({
  getAvailableSlots: vi.fn(),
  getMonthAvailability: vi.fn(),
  getFirstMonthAvailable: vi.fn()
}));

import router from '../../../../../src/modules/availability/public/availability.public.routes';
import * as availabilityPublicService from '../../../../../src/modules/availability/public/availability.public.services';

const mockedService = vi.mocked(availabilityPublicService);

describe('availability.public.routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/availability', router);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when date format is invalid', async () => {
    const response = await request(app).get('/availability').query({
      date: '10-01-2030',
      durationMinutes: '30'
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('YYYY-MM-DD');
  });

  it('returns slots for valid request and parses date as UTC midnight', async () => {
    mockedService.getAvailableSlots.mockResolvedValue(['09:00', '09:15']);

    const response = await request(app).get('/availability').query({
      date: '2030-01-10',
      durationMinutes: '30'
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(['09:00', '09:15']);

    const calledDate = mockedService.getAvailableSlots.mock.calls[0][0];
    const calledDuration = mockedService.getAvailableSlots.mock.calls[0][1];

    expect(calledDate.toISOString()).toBe('2030-01-10T00:00:00.000Z');
    expect(calledDuration).toBe(30);
  });

  it('returns 400 when month format is invalid', async () => {
    const response = await request(app).get('/availability/month').query({
      month: '2030/01',
      totalDuration: '60'
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('YYYY-MM');
  });

  it('returns month availability for valid request', async () => {
    mockedService.getMonthAvailability.mockResolvedValue(['2030-01-10', '2030-01-11']);

    const response = await request(app).get('/availability/month').query({
      month: '2030-01',
      totalDuration: '60'
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(['2030-01-10', '2030-01-11']);

    const calledMonthDate = mockedService.getMonthAvailability.mock.calls[0][0];
    const calledDuration = mockedService.getMonthAvailability.mock.calls[0][1];

    expect(calledMonthDate.toISOString()).toBe('2030-01-01T00:00:00.000Z');
    expect(calledDuration).toBe(60);
  });

  it('returns 400 when firstMonthAvailable totalDuration is invalid', async () => {
    const response = await request(app)
      .post('/availability/firstMonthAvailable')
      .send({ totalDuration: 0 });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('totalDuration');
  });

  it('returns first available month for valid firstMonthAvailable payload', async () => {
    mockedService.getFirstMonthAvailable.mockResolvedValue('2030-02');

    const response = await request(app)
      .post('/availability/firstMonthAvailable')
      .send({ totalDuration: 60, maxMonthsAhead: 12 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ month: '2030-02' });
    expect(mockedService.getFirstMonthAvailable).toHaveBeenCalledWith(60, 12);
  });
});
