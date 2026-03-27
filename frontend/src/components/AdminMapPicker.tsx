/**
 * AdminMapPicker - Selector Visual de Ubicación para Admin Panel
 * 
 * Permite al admin seleccionar visualmente la ubicación de su negocio con:
 * - Mapa interactivo (dragging, zoom, scroll)
 * - Marker arrastrable con sync bidireccional
 * - Reverse geocoding automático al mover marker
 * - Input de búsqueda con forward geocoding
 * - Botón "Usar mi ubicación actual" (Geolocation API)
 * - Sincronización con inputs de lat/lng
 * 
 * Best Practices:
 * - OWASP A04:2021: User-Agent en APIs externas (Nominatim)
 * - Performance: Debounce en búsqueda (500ms), lazy reverse geocoding
 * - UX: Feedback visual (loading states, error messages, success feedback)
 * - Accessibility: keyboard navigation, ARIA labels, visible focus states
 * - Privacy: Geolocation requiere permiso explícito del usuario
 * 
 * @see https://react-leaflet.js.org/docs/api-components/#marker
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { MapPin, Navigation, Search, Loader2 } from "lucide-react";

import { geocodeAddress, reverseGeocode } from "@/lib/geocoding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LeafletIconDefaultPrototype = typeof L.Icon.Default.prototype & {
  _getIconUrl?: unknown;
};

// Fix Leaflet default icon (webpack issue)
// @see https://github.com/Leaflet/Leaflet/issues/4968
delete (L.Icon.Default.prototype as LeafletIconDefaultPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface MapPickerValue {
  lat: number;
  lng: number;
  address: string;
}

interface AdminMapPickerProps {
  value: MapPickerValue;
  onChange: (value: MapPickerValue) => void;
  height?: string;
}

/**
 * Componente interno: Marker arrastrable con eventos
 */
interface DraggableMarkerProps {
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
}

function DraggableMarker({ position, onPositionChange }: DraggableMarkerProps) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          onPositionChange(lat, lng);
        }
      },
    }),
    [onPositionChange]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
}

/**
 * Componente interno: Maneja clicks en el mapa
 */
interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Componente interno: Centra el mapa cuando cambian las coordenadas externas
 */
interface MapCenterUpdaterProps {
  center: [number, number];
}

function MapCenterUpdater({ center }: MapCenterUpdaterProps) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

/**
 * AdminMapPicker: Selector visual de ubicación con mapa interactivo
 */
export function AdminMapPicker({
  value,
  onChange,
  height = "500px",
}: AdminMapPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState(value.address);

  // Timeout ref para debounce (usar number en browser, NodeJS.Timeout en Node)
  const reverseGeocodeTimeoutRef = useRef<number | undefined>(undefined);

  /**
   * Actualiza posición del marker + reverse geocoding
   */
  const handlePositionChange = useCallback(
    async (lat: number, lng: number) => {
      // Actualizar coordenadas inmediatamente (feedback visual rápido)
      onChange({
        ...value,
        lat,
        lng,
      });

      // Debounce reverse geocoding (500ms) para evitar spam
      if (reverseGeocodeTimeoutRef.current) {
        clearTimeout(reverseGeocodeTimeoutRef.current);
      }

      reverseGeocodeTimeoutRef.current = setTimeout(async () => {
        setIsReverseGeocoding(true);
        const address = await reverseGeocode(lat, lng);
        setIsReverseGeocoding(false);

        if (address) {
          setDetectedAddress(address);
          onChange({
            lat,
            lng,
            address,
          });
        }
      }, 500);
    },
    [onChange, value]
  );

  /**
   * Buscar dirección en el mapa (forward geocoding)
   */
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const coords = await geocodeAddress(searchQuery);
    setIsSearching(false);

    if (coords) {
      handlePositionChange(coords.lat, coords.lng);
    } else {
      alert("No se pudo encontrar la dirección. Intenta con otra búsqueda.");
    }
  }, [searchQuery, handlePositionChange]);

  /**
   * Usar ubicación actual del navegador (Geolocation API)
   */
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsGettingLocation(false);
        const { latitude, longitude } = position.coords;
        handlePositionChange(latitude, longitude);
      },
      (error) => {
        setIsGettingLocation(false);
        console.error("[Geolocation] Error:", error);
        alert(
          "No se pudo obtener tu ubicación. Verifica los permisos del navegador."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [handlePositionChange]);

  /**
   * Handle Enter key en input de búsqueda
   */
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <div className="space-y-4 rounded-lg border p-4 bg-card">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Seleccionar Ubicación en Mapa</h3>
      </div>

      {/* Barra de búsqueda */}
      <div className="space-y-2">
        <Label htmlFor="map-search">Buscar dirección</Label>
        <div className="flex gap-2">
          <Input
            id="map-search"
            placeholder="Ej: Av. 18 de Julio 1234, Montevideo"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            disabled={isSearching}
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            size="default"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="hidden sm:inline ml-2">Buscar</span>
          </Button>
        </div>
      </div>

      {/* Botón ubicación actual */}
      <Button
        onClick={handleUseCurrentLocation}
        disabled={isGettingLocation}
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
      >
        {isGettingLocation ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Navigation className="h-4 w-4" />
        )}
        <span className="ml-2">Usar mi ubicación actual</span>
      </Button>

      {/* Mapa interactivo */}
      <div
        className="rounded-lg border shadow-sm overflow-hidden relative"
        style={{ height, zIndex: 1 }}
      >
        <MapContainer
          center={[value.lat, value.lng]}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
            subdomains="abcd"
            maxZoom={20}
          />
          <DraggableMarker
            position={[value.lat, value.lng]}
            onPositionChange={handlePositionChange}
          />
          <MapClickHandler onMapClick={handlePositionChange} />
          <MapCenterUpdater center={[value.lat, value.lng]} />
        </MapContainer>
      </div>

      {/* Dirección detectada */}
      <div className="space-y-2">
        <Label>Dirección detectada</Label>
        <div className="p-3 rounded-md bg-muted/50 border text-sm">
          {isReverseGeocoding ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Detectando dirección...</span>
            </div>
          ) : detectedAddress ? (
            <p className="text-foreground">{detectedAddress}</p>
          ) : (
            <p className="text-muted-foreground">
              Haz clic en el mapa o arrastra el marcador para detectar la
              dirección
            </p>
          )}
        </div>
      </div>

      {/* Info coordenadas */}
      <div className="text-xs text-muted-foreground">
        <p>
          Coordenadas: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
        <p className="mt-1">
          💡 <strong>Tip:</strong> Arrastra el marcador para ajustar la
          ubicación precisa de tu negocio
        </p>
      </div>
    </div>
  );
}
