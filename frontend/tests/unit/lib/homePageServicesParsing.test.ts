import { describe, expect, it } from 'vitest';
import { createMockService } from '../../fixtures/mockData';
import { parseActiveServicesPreview } from '../../../src/pages/HomePage';

describe('parseActiveServicesPreview', () => {
  it('returns only active services and limits preview to five items', () => {
    const payload = [
      createMockService({ id: 's1', isActive: true }),
      createMockService({ id: 's2', isActive: false }),
      createMockService({ id: 's3', isActive: true }),
      createMockService({ id: 's4', isActive: true }),
      createMockService({ id: 's5', isActive: true }),
      createMockService({ id: 's6', isActive: true }),
      createMockService({ id: 's7', isActive: true }),
    ];

    const result = parseActiveServicesPreview(payload);

    expect(result).toHaveLength(5);
    expect(result.every((service) => service.isActive)).toBe(true);
    expect(result.map((service) => service.id)).toEqual(['s1', 's3', 's4', 's5', 's6']);
  });

  it('returns empty array when payload is not a service array', () => {
    expect(parseActiveServicesPreview(null)).toEqual([]);
    expect(parseActiveServicesPreview({})).toEqual([]);
    expect(parseActiveServicesPreview([{ id: 'bad-shape' }])).toEqual([]);
  });
});
