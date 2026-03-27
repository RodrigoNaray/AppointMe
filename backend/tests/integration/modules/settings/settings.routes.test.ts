import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { createSettingsError } from '../../../fixtures/mocks';

type AdminAuthRequest = Request & {
  user?: { id: string };
};

vi.mock('../../../../src/middlewares/isAdminAuthenticated', () => ({
  isAdminAuthenticated: (req: Request, _res: Response, next: NextFunction) => {
    (req as AdminAuthRequest).user = { id: 'admin-1' };
    next();
  }
}));

vi.mock('../../../../src/modules/settings/settings.services', () => ({
  getBookingRules: vi.fn(),
  getBusinessHours: vi.fn(),
  updateBookingRules: vi.fn(),
  getContactInfo: vi.fn(),
  updateContactInfo: vi.fn()
}));

import { adminSettingsRoutes, settingsRoutes } from '../../../../src/modules/settings/settings.routes';
import * as settingsServices from '../../../../src/modules/settings/settings.services';

const mockedService = vi.mocked(settingsServices);
type BusinessHours = Awaited<ReturnType<typeof settingsServices.getBusinessHours>>;

describe('settings.routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/settings', settingsRoutes);
  app.use('/admin/settings', adminSettingsRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns booking rules in GET /settings/booking-rules', async () => {
    mockedService.getBookingRules.mockResolvedValue({
      minBookingAdvanceMinutes: 60,
      minCancellationNoticeMinutes: 120
    });

    const response = await request(app).get('/settings/booking-rules');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.minBookingAdvanceMinutes).toBe(60);
  });

  it('returns business hours and cache header', async () => {
    mockedService.getBusinessHours.mockResolvedValue(
      {
        monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' }
      } as unknown as BusinessHours
    );

    const response = await request(app).get('/settings/business-hours');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('public, max-age=300');
  });

  it('returns contact info in GET /settings/contact-info', async () => {
    mockedService.getContactInfo.mockResolvedValue({
      phone: '+59812345678',
      email: 'info@example.com',
      address: 'Av. Principal 123',
      latitude: null,
      longitude: null
    });

    const response = await request(app).get('/settings/contact-info');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('updates booking rules in PUT /admin/settings/booking-rules', async () => {
    mockedService.updateBookingRules.mockResolvedValue({
      minBookingAdvanceMinutes: 120,
      minCancellationNoticeMinutes: 240
    });

    const response = await request(app)
      .put('/admin/settings/booking-rules')
      .send({ minBookingAdvanceMinutes: 120, minCancellationNoticeMinutes: 240 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('returns service status code and fallback data when updateBookingRules fails validation', async () => {
    mockedService.updateBookingRules.mockRejectedValue(
      createSettingsError('invalid', 400)
    );

    const response = await request(app)
      .put('/admin/settings/booking-rules')
      .send({ minBookingAdvanceMinutes: -1 });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.data.minBookingAdvanceMinutes).toBe(60);
  });

  it('updates contact info in PUT /admin/settings/contact-info', async () => {
    mockedService.updateContactInfo.mockResolvedValue({
      phone: '+59812345678',
      email: 'info@example.com',
      address: 'Av. Principal 123',
      latitude: -34.9,
      longitude: -56.2
    });

    const response = await request(app)
      .put('/admin/settings/contact-info')
      .send({ businessEmail: 'info@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
