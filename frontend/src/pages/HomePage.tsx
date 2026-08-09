import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, lazy, Suspense, useMemo } from "react";
import toast from "react-hot-toast";
import { useAuthStore, selectCheckSession } from "@/stores/authStore";
import { useOAuthStore, selectGetReturnUrl, selectClearReturnUrl } from "@/stores/oauthStore";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, MapPin } from "lucide-react";
import type { Service } from "@/types/service";
import type { BusinessHours, ContactInfo } from "@/api/modules/settings";
import { getBusinessHours, getContactInfo } from "@/api/modules/settings";
import { getServices } from "@/api/modules/services";
import { geocodeAddress, type GeocodingResult } from "@/lib/geocoding";
import { formatOpenDaysSummary } from "@/lib/businessHoursLabel";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ServicesCarousel } from "@/components/home/ServicesCarousel";

const AppMap = lazy(() => import("@/components/ui/AppMap").then(module => ({ default: module.AppMap })));

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isCategory = (value: unknown): boolean => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.description === null || typeof value.description === 'string') &&
    typeof value.isActive === 'boolean'
  );
};

const isService = (value: unknown): value is Service => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.description === null || typeof value.description === 'string') &&
    typeof value.durationMinutes === 'number' &&
    typeof value.price === 'number' &&
    typeof value.isActive === 'boolean' &&
    typeof value.categoryId === 'string' &&
    isCategory(value.category)
  );
};

export const parseActiveServicesPreview = (payload: unknown): Service[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter((item): item is Service => isService(item) && item.isActive)
    .slice(0, 5);
};

export default function HomePage() {
  usePageTitle("AppointMePro — Reserva tu turno online");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkSession = useAuthStore(selectCheckSession);
  const getReturnUrl = useOAuthStore(selectGetReturnUrl);
  const clearReturnUrl = useOAuthStore(selectClearReturnUrl);
  const hasProcessedCallback = useRef(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [businessHours, setBusinessHours] = useState<BusinessHours | undefined>();
  const [loadingHours, setLoadingHours] = useState(true);
  const [contactInfo, setContactInfo] = useState<ContactInfo | undefined>();
  const [loadingContact, setLoadingContact] = useState(true);
  const [mapCoordinates, setMapCoordinates] = useState<GeocodingResult | null>(null);

  const heroReveal = useScrollReveal(0.1);
  const servicesReveal = useScrollReveal(0.1);
  const mapReveal = useScrollReveal(0.1);

  const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

  const isOpenToday = useMemo(() => {
    if (!businessHours) return false;
    const todayKey = DAY_KEYS[new Date().getDay()];
    const todaySchedule = businessHours[todayKey];
    if (!todaySchedule) return false;
    return todaySchedule.isOpen === true;
  }, [businessHours]);

  const hoursLabel = useMemo(() => formatOpenDaysSummary(businessHours), [businessHours]);

  const businessInitials = useMemo(() => {
    const name = contactInfo?.businessName;
    if (!name) return 'AP';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('') || 'AP';
  }, [contactInfo]);

  const locationLabel = useMemo(() => {
    if (!contactInfo?.address || contactInfo.address === 'Dirección no disponible') return null;
    const parts = contactInfo.address.split(',');
    return parts[parts.length - 1]?.trim() || parts[0]?.trim();
  }, [contactInfo]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await getServices({ limit: 5 });
        setServices(res.services);
      } catch {
        setServices([]);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    const fetchBusinessHours = async () => {
      try {
        const hours = await getBusinessHours();
        setBusinessHours(hours);
      } catch (error) {
        console.error('Error fetching business hours:', error);
      } finally {
        setLoadingHours(false);
      }
    };
    fetchBusinessHours();
  }, []);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const contact = await getContactInfo();
        setContactInfo(contact);
      } catch (error) {
        console.error('Error fetching contact info:', error);
      } finally {
        setLoadingContact(false);
      }
    };
    fetchContactInfo();
  }, []);

  useEffect(() => {
    if (!contactInfo) return;

    if (contactInfo.latitude !== null && contactInfo.longitude !== null) {
      setMapCoordinates({
        lat: contactInfo.latitude,
        lng: contactInfo.longitude,
      });
      return;
    }

    if (contactInfo.address && contactInfo.address !== 'Dirección no disponible') {
      geocodeAddress(contactInfo.address)
        .then((coords) => {
          if (coords) {
            setMapCoordinates(coords);
          } else {
            setMapCoordinates(null);
          }
        })
        .catch((error) => {
          console.error('[HomePage] Geocoding error:', error);
          setMapCoordinates(null);
        });
    }
  }, [contactInfo]);

  useEffect(() => {
    if (hasProcessedCallback.current) return;

    const loginStatus = searchParams.get('login');
    const errorParam = searchParams.get('error');

    if (loginStatus === 'success') {
      hasProcessedCallback.current = true;

      checkSession();

      const savedReturnUrl = getReturnUrl();

      if (savedReturnUrl) {
        clearReturnUrl();
        setSearchParams({});
        toast.success('¡Bienvenido! Has iniciado sesión con Google');
        navigate(savedReturnUrl);
      } else {
        toast.success('¡Bienvenido! Has iniciado sesión con Google');
        setSearchParams({});
      }
    } else if (errorParam) {
      hasProcessedCallback.current = true;

      let errorMessage = 'Error al iniciar sesión con Google';

      if (errorParam === 'google_auth_failed') {
        errorMessage = 'No se pudo autenticar con Google. Intenta nuevamente.';
      } else if (errorParam === 'authentication_failed') {
        errorMessage = 'Error en la autenticación. Por favor intenta de nuevo.';
      } else if (errorParam === 'server_error') {
        errorMessage = 'Error del servidor. Por favor intenta más tarde.';
      }

      toast.error(errorMessage);

      setSearchParams({});
    }
  }, [searchParams, setSearchParams, checkSession]);

  return (
    <div className="bg-background">
      <section className="relative w-full overflow-hidden noise-bg border-b border-border">
        <div className="absolute top-0 right-0 w-72 h-72 sm:w-96 sm:h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 sm:w-80 sm:h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div ref={heroReveal.ref} className={`mx-auto max-w-4xl px-4 py-8 sm:py-10 lg:py-14 ${heroReveal.isVisible ? 'visible' : ''} animate-reveal`}>
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-10">
            <div className="relative shrink-0">
              <div className="h-24 w-24 overflow-hidden rounded-full bg-primary sm:h-28 sm:w-28 lg:h-32 lg:w-32 shadow-lg ring-4 ring-background">
                <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white sm:text-5xl">
                  {businessInitials}
                </div>
              </div>
              {isOpenToday && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-success px-3 py-1 text-xs font-semibold text-success-foreground shadow-sm">
                  Disponible Hoy
                </div>
              )}
            </div>

            <div className="flex-1 text-center lg:text-left">
              <h1 className="mb-2 text-3xl font-bold tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
                {contactInfo?.businessName || 'Tu negocio'}
              </h1>
              <p className="mb-3 text-lg text-muted-foreground sm:text-xl">
                {contactInfo?.businessDescription || 'Reservá tu turno online'}
              </p>

              {(hoursLabel || locationLabel) && (
                <div className="mb-4 flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {hoursLabel && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {hoursLabel}
                    </span>
                  )}
                  {locationLabel && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {locationLabel}
                    </span>
                  )}
                </div>
              )}

              {contactInfo?.businessDescription && (
                <p className="mb-6 max-w-lg text-sm text-muted-foreground sm:text-base lg:max-w-none">
                  {contactInfo.businessDescription}
                </p>
              )}

              <Link to="/book">
                <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-sm hover:shadow-md transition-shadow">
                  Reservar Ahora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-background">
        <div ref={servicesReveal.ref} className={`mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10 ${servicesReveal.isVisible ? 'visible' : ''} animate-reveal`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Nuestros Servicios
            </h2>
          </div>

          {loadingServices ? (
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="min-w-[280px] sm:min-w-[320px] rounded-xl border border-border bg-card p-5 space-y-3 animate-pulse shrink-0">
                  <div className="h-5 w-24 bg-muted rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                  <div className="h-4 w-20 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : services.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8">No hay servicios disponibles aún.</p>
          ) : (
            <>
              <ServicesCarousel services={services} />

              <div className="mt-8 flex justify-center lg:justify-start">
                <Link to="/book">
                  <Button variant="outline" size="lg" className="h-12 px-6 text-base font-semibold border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 group">
                    Ver todos los servicios
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="w-full border-t border-border bg-background">
        <div ref={mapReveal.ref} className={`mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10 ${mapReveal.isVisible ? 'visible' : ''} animate-reveal`}>
          <h2 className="mb-6 text-2xl font-bold text-foreground sm:text-3xl">
            Ubicación
          </h2>
          {mapCoordinates ? (
            <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
              <Suspense fallback={<div className="h-[300px] w-full animate-pulse bg-muted" />}>
                <AppMap
                  lat={mapCoordinates.lat}
                  lng={mapCoordinates.lng}
                  zoom={15}
                  height="400px"
                  label={contactInfo?.address || ''}
                />
              </Suspense>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <MapPin className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {contactInfo?.address && contactInfo.address !== 'Dirección no disponible'
                  ? contactInfo.address
                  : 'Ubicación no disponible'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
