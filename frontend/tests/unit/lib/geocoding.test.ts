import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearGeocodingCache, geocodeAddress, reverseGeocode } from '@/lib/geocoding';

describe('geocoding utilities', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns null for empty addresses without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await geocodeAddress('   ');

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns cached coordinates when cache is valid', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    sessionStorage.setItem('geocode_av. principal 123', JSON.stringify({ lat: -34.9, lng: -56.2 }));

    const result = await geocodeAddress('Av. Principal 123');

    expect(result).toEqual({ lat: -34.9, lng: -56.2 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to fetch when cached coordinates are invalid', async () => {
    sessionStorage.setItem('geocode_av. principal 123', JSON.stringify({ lat: 999, lng: 999 }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '-34.901', lon: '-56.164', display_name: 'Address' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await geocodeAddress('Av. Principal 123');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ lat: -34.901, lng: -56.164 });
  });

  it('returns null when geocoding fetch fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await geocodeAddress('Av. Principal 123');

    expect(result).toBeNull();
  });

  it('sends required User-Agent header to Nominatim', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '-34.901', lon: '-56.164', display_name: 'Address' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    await geocodeAddress('Av. Principal 123');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers['User-Agent']).toContain('AppointMePro/1.0');
  });

  it('returns null for invalid reverse geocode coordinates', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await reverseGeocode(100, -56.2);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears geocoding and reverse cache entries', () => {
    sessionStorage.setItem('geocode_one', JSON.stringify({ lat: -34.9, lng: -56.2 }));
    sessionStorage.setItem('reverse_-34.9_-56.2', 'Address');
    sessionStorage.setItem('non_geocode_key', 'keep');

    clearGeocodingCache();

    expect(sessionStorage.getItem('geocode_one')).toBeNull();
    expect(sessionStorage.getItem('reverse_-34.9_-56.2')).toBeNull();
    expect(sessionStorage.getItem('non_geocode_key')).toBe('keep');
  });
});