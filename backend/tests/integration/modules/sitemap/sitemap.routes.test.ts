import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/modules/sitemap/sitemap.service', () => ({
  generateSitemapXml: vi.fn()
}));

import router from '../../../../src/modules/sitemap/sitemap.routes';
import * as sitemapService from '../../../../src/modules/sitemap/sitemap.service';
import { createTestApp } from '../../../fixtures/testHelpers';

const mockedService = vi.mocked(sitemapService);

describe('sitemap.routes', () => {
  const app = createTestApp('/', router);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns sitemap xml with expected headers', async () => {
    mockedService.generateSitemapXml.mockResolvedValue('<?xml version="1.0"?><urlset></urlset>');

    const response = await request(app).get('/sitemap.xml');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.headers['cache-control']).toContain('max-age=3600');
  });

  it('returns 500 when sitemap generation fails', async () => {
    mockedService.generateSitemapXml.mockRejectedValue(new Error('failed'));

    const response = await request(app).get('/sitemap.xml');

    expect(response.status).toBe(500);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('Error generating sitemap');
  });
});
