/**
 * Geocoding Service - Nominatim (OpenStreetMap)
 * 
 * Convierte direcciones de texto a coordenadas geográficas (lat/lng).
 * 
 * Best Practices:
 * - OWASP A04:2021 (Insecure Design): User-Agent obligatorio (RFC 7231) para prevenir abuse
 * - Performance: Cache en sessionStorage para evitar requests repetidos
 * - Privacy: Nominatim no requiere API key, sin tracking de usuarios
 * - Error handling: Devuelve null en caso de fallo (graceful degradation)
 * - Rate limiting: 1 request por segundo (Nominatim Usage Policy)
 * 
 * @see https://nominatim.org/release-docs/latest/api/Search/
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
}

/**
 * Geocodifica una dirección usando Nominatim API
 * 
 * @param address - Dirección de texto (ej: "Av. 18 de Julio 1234, Montevideo, Uruguay")
 * @returns Coordenadas {lat, lng} o null si falla
 * 
 * @example
 * const coords = await geocodeAddress("Av. 18 de Julio 1234, Montevideo");
 * if (coords) {
 *   console.log(`Lat: ${coords.lat}, Lng: ${coords.lng}`);
 * }
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodingResult | null> {
  // Validación input
  if (!address || address.trim().length === 0) {
    return null;
  }

  const cacheKey = `geocode_${address.trim().toLowerCase()}`;

  // 1. Verificar cache (sessionStorage)
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as GeocodingResult;
      // Validar que tenga estructura correcta
      if (
        typeof parsed.lat === "number" &&
        typeof parsed.lng === "number" &&
        parsed.lat >= -90 &&
        parsed.lat <= 90 &&
        parsed.lng >= -180 &&
        parsed.lng <= 180
      ) {
        return parsed;
      }
    }
  } catch (error) {
    // Cache corrupto, continuar con request
    console.warn("[Geocoding] Cache inválido, refetching:", error);
  }

  // 2. Llamar a Nominatim API
  try {
    const params = new URLSearchParams({
      format: "json",
      q: address.trim(),
      limit: "1",
      addressdetails: "0",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          // CRÍTICO: User-Agent obligatorio (Nominatim Usage Policy)
          // OWASP A04:2021: Identificación del cliente para rate limiting
          "User-Agent": "AppointMePro/1.0 (contact: admin@appointmepro.com)",
        },
      }
    );

    if (!response.ok) {
      console.error(
        "[Geocoding] Nominatim error:",
        response.status,
        response.statusText
      );
      return null;
    }

    const data = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    // Validar respuesta
    if (!Array.isArray(data) || data.length === 0) {
      console.warn("[Geocoding] No results for address:", address);
      return null;
    }

    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Validar coordenadas (rango válido)
    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      console.error("[Geocoding] Invalid coordinates:", result);
      return null;
    }

    const coords: GeocodingResult = { lat, lng };

    // 3. Guardar en cache
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(coords));
    } catch (error) {
      // sessionStorage lleno o bloqueado, no es crítico
      console.warn("[Geocoding] Cache storage failed:", error);
    }

    return coords;
  } catch (error) {
    console.error("[Geocoding] Fetch error:", error);
    return null;
  }
}

/**
 * Limpia el cache de geocoding
 * 
 * Útil para testing o cuando el usuario cambia la dirección en admin.
 */
export function clearGeocodingCache(): void {
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach((key) => {
      if (key.startsWith("geocode_") || key.startsWith("reverse_")) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn("[Geocoding] Cache clear failed:", error);
  }
}

/**
 * Reverse Geocoding: Convierte coordenadas a dirección legible
 * 
 * @param lat - Latitud (rango: -90 a 90)
 * @param lng - Longitud (rango: -180 a 180)
 * @returns Dirección formateada o null si falla
 * 
 * @example
 * const address = await reverseGeocode(-34.9011, -56.1645);
 * // "Avenida 18 de Julio 1234, Montevideo, Uruguay"
 * 
 * Best Practices:
 * - OWASP A04:2021: User-Agent obligatorio (mismo que forward geocoding)
 * - Cache: sessionStorage con key `reverse_${lat}_${lng}`
 * - Validación: Coordenadas fuera de rango retornan null
 * - Error handling: Graceful degradation (null en caso de fallo)
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  // Validación input (rango coordenadas válidas)
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    isNaN(lat) ||
    isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    console.error("[ReverseGeocode] Invalid coordinates:", { lat, lng });
    return null;
  }

  // Redondear a 6 decimales para cache (precisión ~10cm)
  const roundedLat = Math.round(lat * 1000000) / 1000000;
  const roundedLng = Math.round(lng * 1000000) / 1000000;
  const cacheKey = `reverse_${roundedLat}_${roundedLng}`;

  // 1. Verificar cache (sessionStorage)
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (error) {
    console.warn("[ReverseGeocode] Cache read failed:", error);
  }

  // 2. Llamar a Nominatim Reverse API
  try {
    const params = new URLSearchParams({
      format: "json",
      lat: roundedLat.toString(),
      lon: roundedLng.toString(),
      zoom: "18", // Nivel de detalle máximo (edificio/calle)
      addressdetails: "1",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      {
        headers: {
          // CRÍTICO: User-Agent obligatorio (Nominatim Usage Policy)
          // OWASP A04:2021: Identificación del cliente para rate limiting
          "User-Agent": "AppointMePro/1.0 (contact: admin@appointmepro.com)",
        },
      }
    );

    if (!response.ok) {
      console.error(
        "[ReverseGeocode] Nominatim error:",
        response.status,
        response.statusText
      );
      return null;
    }

    const data = (await response.json()) as {
      display_name?: string;
      address?: {
        road?: string;
        house_number?: string;
        city?: string;
        state?: string;
        country?: string;
      };
      error?: string;
    };

    // Validar respuesta
    if (data.error || !data.display_name) {
      console.warn("[ReverseGeocode] No address found for coordinates:", {
        lat,
        lng,
      });
      return null;
    }

    const address = data.display_name;

    // 3. Guardar en cache
    try {
      sessionStorage.setItem(cacheKey, address);
    } catch (error) {
      console.warn("[ReverseGeocode] Cache storage failed:", error);
    }

    return address;
  } catch (error) {
    console.error("[ReverseGeocode] Fetch error:", error);
    return null;
  }
}
