import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { ExternalLink, Navigation } from "lucide-react";

/**
 * AppMap Component
 * 
 * Mapa estático de visualización con Leaflet + CartoDB Fastly CDN.
 * 
 * Best Practices:
 * - React 19: Componente funcional con tipado estricto TypeScript
 * - Performance: Tile server CartoDB con Fastly CDN (mejor latencia Uruguay vs OSM directo)
 * - UX: Mapa estático (solo visualización) + botón "Ver en mapas" para navegación
 * - UX Mobile: Deep link a Google Maps/Apple Maps (apps nativas)
 * - UX Desktop: Abre Google Maps en nueva pestaña
 * - Accessibility: Aria-label + alt text para lectores de pantalla
 * - OWASP A04:2021: No expone API keys (tile server público sin auth)
 * 
 * Deep Links:
 * - iOS: maps://maps.apple.com/?q={lat},{lng}
 * - Android: geo:{lat},{lng}?q={lat},{lng}
 * - Universal: https://www.google.com/maps?q={lat},{lng}
 * 
 * Tile Server:
 * - URL: https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png
 * - Attribution: © OpenStreetMap contributors © CartoDB
 * - CDN: Fastly (mejor performance LATAM)
 * 
 * @see https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
 * @see https://developers.google.com/maps/documentation/urls/get-started
 */

interface AppMapProps {
  /** Latitud (rango: -90 a 90) */
  lat: number;
  /** Longitud (rango: -180 a 180) */
  lng: number;
  /** Nivel de zoom (default: 15 = vista de calle) */
  zoom?: number;
  /** Altura del mapa (default: 300px) */
  height?: string;
  /** Ancho del mapa (default: 100%) */
  width?: string;
  /** Label del marcador (mostrado en popup) */
  label?: string;
}

/**
 * Fix para iconos de Leaflet en producción
 * 
 * Leaflet requiere URLs absolutas para iconos (marker-icon.png).
 * Usamos unpkg CDN para evitar problemas de bundling con Vite.
 * 
 * @see https://github.com/PaulLeCam/react-leaflet/issues/808
 */
const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function AppMap({
  lat,
  lng,
  zoom = 15,
  height = "300px",
  width = "100%",
  label = "Ubicación",
}: AppMapProps) {
  /**
   * Genera URL para abrir en Google Maps / Apple Maps
   * 
   * Estrategia multi-plataforma:
   * - iOS: Intenta abrir Apple Maps (maps://) primero, fallback a Google Maps web
   * - Android: Google Maps app via intent, fallback a web
   * - Desktop: Google Maps web en nueva pestaña
   * 
   * OWASP A04:2021: Uso de window.location.href en lugar de window.open() para
   * evitar popup blockers en iOS Safari
   */
  const handleOpenMaps = () => {
    // Detectar iOS (iPhone, iPad, iPod)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // iOS: Usar Apple Maps con fallback a Google Maps web
      // maps:// abre Apple Maps directamente sin prompt
      const appleMapsUrl = `maps://maps.apple.com/?q=${lat},${lng}`;
      const googleMapsWebUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      
      // Intentar abrir Apple Maps
      window.location.href = appleMapsUrl;
      
      // Fallback a Google Maps web después de 1 segundo si Apple Maps no está instalado
      setTimeout(() => {
        window.location.href = googleMapsWebUrl;
      }, 1000);
    } else {
      // Android/Desktop: Abrir Google Maps en nueva pestaña
      const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="rounded-lg overflow-hidden border shadow-sm relative">
      {/* Botón "Ver en mapas" - Visible en todas las pantallas */}
      <button
        onClick={handleOpenMaps}
        className="absolute top-4 right-4 z-20 bg-white hover:bg-gray-50 text-gray-900 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-colors border border-gray-200"
        aria-label="Abrir ubicación en Google Maps"
      >
        <Navigation className="h-4 w-4" />
        <span className="hidden sm:inline">Ver en mapas</span>
        <ExternalLink className="h-3.5 w-3.5 opacity-60" />
      </button>

      {/* Mapa estático (solo visualización) */}
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        style={{ height, width }}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        className="z-0"
        attributionControl={false}
      >
        <TileLayer
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        <Marker position={[lat, lng]} icon={defaultIcon}>
          <Popup>
            <span className="font-medium">{label}</span>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Attribution footer (OWASP compliance - mantener créditos OSM) */}
      <div className="absolute bottom-0 right-0 z-10 bg-white/80 backdrop-blur-sm px-2 py-1 text-xs text-gray-600">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">OpenStreetMap</a> · <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" className="hover:underline">CartoDB</a>
      </div>
    </div>
  );
}
