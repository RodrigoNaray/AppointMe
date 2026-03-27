import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    category: {
      findMany: vi.fn()
    }
  }
}));

vi.mock('../../../../src/config/prisma', () => ({
  default: mockPrisma
}));

import { generateSitemapXml } from '../../../../src/modules/sitemap/sitemap.service';

describe('sitemap.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates XML sitemap with static and category urls', async () => {
    mockPrisma.category.findMany.mockResolvedValue([
      {
        id: 'cat-1',
        updatedAt: new Date('2030-01-01T00:00:00.000Z')
      }
    ]);

    const xml = await generateSitemapXml('https://example.com');

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<loc>https://example.com/</loc>');
    expect(xml).toContain('<loc>https://example.com/book?category=cat-1</loc>');
    expect(xml).toContain('<lastmod>2030-01-01T00:00:00.000Z</lastmod>');
  });

  it('escapes XML-special characters in dynamic urls', async () => {
    mockPrisma.category.findMany.mockResolvedValue([
      {
        id: 'cat&<1>',
        updatedAt: new Date('2030-01-01T00:00:00.000Z')
      }
    ]);

    const xml = await generateSitemapXml('https://example.com');

    expect(xml).toContain('cat&amp;&lt;1&gt;');
  });
});
