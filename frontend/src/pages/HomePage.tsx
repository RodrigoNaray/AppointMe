import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import toast from "react-hot-toast";
import { useAuthStore, selectCheckSession } from "@/stores/authStore";
import { useBookingStore, selectCart } from "@/stores/bookingStore";
import { useOAuthStore, selectGetReturnUrl, selectClearReturnUrl } from "@/stores/oauthStore";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Sparkles, ArrowRight, Star, Scissors } from "lucide-react";
import ServicesTable from "@/components/shared/ServicesTable";
import CartSidebar from "@/components/CartSidebar";
import BusinessHoursCard from "@/components/BusinessHoursCard";
import ContactInfoCard from "@/components/ContactInfoCard";
import { Trans, useTranslation } from "react-i18next";
import type { Service } from "@/types/service";
import type { BusinessHours, ContactInfo } from "@/api/modules/settings";
import { getBusinessHours, getContactInfo } from "@/api/modules/settings";
import { API_BASE_URL } from "@/api/config";
import { geocodeAddress, type GeocodingResult } from "@/lib/geocoding";

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
    typeof value.isActive === 'boolean' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
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
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkSession = useAuthStore(selectCheckSession);
  const cart = useBookingStore(selectCart);
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
  const hasItems = cart.length > 0;

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        const response = await fetch(`${baseUrl}/services`);
        if (response.ok) {
          const data: unknown = await response.json();
          setServices(parseActiveServicesPreview(data));
        }
      } catch (error) {
        console.error('Error fetching services:', error);
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
        toast.success(t('auth.googleLoginSuccess'));
        navigate(savedReturnUrl);
      } else {
        toast.success(t('auth.googleLoginSuccess'));
        setSearchParams({});
      }
    } else if (errorParam) {
      hasProcessedCallback.current = true;

      let errorMessage = t('auth.googleLoginError');

      if (errorParam === 'google_auth_failed') {
        errorMessage = t('auth.googleAuthFailed');
      } else if (errorParam === 'authentication_failed') {
        errorMessage = t('auth.authenticationFailed');
      } else if (errorParam === 'server_error') {
        errorMessage = t('auth.authServerError');
      }

      toast.error(errorMessage);

      setSearchParams({});
    }
  }, [searchParams, setSearchParams, checkSession]);

  return (
    <div className={`min-h-screen bg-background ${hasItems ? 'pb-64' : 'pb-32'} lg:pb-0`}>
      {/* Hero Section */}
      <section className="relative w-full px-4 py-8 sm:px-6 md:py-12 lg:py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Badge */}
          <div className="mb-6 flex justify-center sm:justify-start">
            <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('home.badge')}
            </span>
          </div>

          {/* Título Principal */}
          <h1 className="mb-4 text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
            {t('appName')}
          </h1>

          {/* Subtítulo */}
          <h2 className="mb-4 text-2xl font-semibold text-foreground/90 sm:text-3xl md:text-4xl">
            {t('home.tagline')}
          </h2>

          {/* Descripción */}
          <p className="mb-8 max-w-3xl text-base text-foreground/70 sm:text-lg md:text-xl">
            {t('home.description')}
          </p>
        </div>
      </section>

      {/* Sección de Ejemplo: Profesional Ficticio */}
      <section className="w-full border-t border-border bg-background px-4 py-12 sm:px-6 md:py-16 lg:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Badge de Ejemplo */}
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground/70 sm:text-sm">
              {t('home.demoBadge')}
            </span>
          </div>

          {/* Texto Explicativo */}
          <p className="mb-8 text-center text-sm text-foreground/70 sm:text-base md:mx-auto md:max-w-3xl">
            <Trans
              i18nKey="home.demoDescription"
              components={{ bold: <span className="font-semibold text-foreground" /> }}
            >
              Este es un ejemplo real de cómo se vería <span className="font-semibold text-foreground">tu negocio</span> en AppointMePro.
              Puedes <span className="font-semibold text-foreground">reservar un servicio</span> y experimentar exactamente lo que tus clientes vivirán.
            </Trans>
          </p>

          {/* Card del Profesional */}
          <div className="rounded-3xl border border-border bg-background p-6 shadow-sm sm:p-8 md:p-10">
            {/* Header: Avatar + Info */}
            <div className="mb-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-20 w-20 overflow-hidden rounded-full bg-foreground/10 sm:h-24 sm:w-24 md:h-28 md:w-28">
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
                    CM
                  </div>
                </div>
                {/* Badge de Disponibilidad */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-success px-3 py-1 text-xs font-semibold text-success-foreground">
                  {t('home.availableToday')}
                </div>
              </div>

              {/* Info del Negocio */}
              <div className="flex-1 text-center sm:text-left">
                <h3 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
                  {t('home.professionalName')}
                </h3>
                <p className="mb-3 text-base text-foreground/80 sm:text-lg md:text-xl">
                  {t('home.professionalTitle')}
                </p>
                <p className="mb-4 max-w-2xl text-sm text-foreground/70 sm:text-base">
                  {t('home.professionalBio')}
                </p>
                {/* Rating */}
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-accent text-accent sm:h-5 sm:w-5" />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-foreground/70 sm:text-base">
                    {t('home.rating')}
                  </span>
                </div>
              </div>
            </div>

            {/* Sección de Servicios y Carrito */}
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-foreground/5 p-2">
                  <Scissors className="h-5 w-5 text-foreground sm:h-6 sm:w-6" />
                </div>
                <h4 className="text-lg font-semibold text-foreground sm:text-xl">{t('home.ourServices')}</h4>
              </div>

              {loadingServices ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground/20 border-t-foreground" />
                </div>
              ) : services.length > 0 ? (
                <>
                  <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
                    {/* Columna 1: Lista de servicios */}
                    <div className="rounded-2xl border border-border bg-background p-4 sm:p-6 lg:h-[450px] lg:flex lg:flex-col">
                      <div className="lg:flex-1 lg:overflow-y-auto">
                        <ServicesTable
                          services={services}
                          showCategory={true}
                          compact={true}
                        />
                      </div>
                      <div className="mt-4 text-center lg:flex-shrink-0">
                        <Link to="/book" className="text-sm font-medium text-foreground hover:underline">
                          {t('home.viewAllServices')}
                        </Link>
                      </div>
                    </div>

                    {/* Columna 2: Carrito - Solo desktop */}
                    <div className="hidden lg:block rounded-2xl border border-border bg-background lg:h-[450px]">
                      <CartSidebar />
                    </div>
                  </div>

                  {/* Carrito Fixed Bottom - Solo móvil */}
                  <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background shadow-2xl">
                    <CartSidebar />
                  </div>
                </>
              ) : null}
            </div>

            {/* Grid de Información */}
            <div className="grid gap-6 md:grid-cols-2">
              <BusinessHoursCard businessHours={businessHours} isLoading={loadingHours} />

              <ContactInfoCard contactInfo={contactInfo} isLoading={loadingContact} />
            </div>

            {/* Mapa */}
            {mapCoordinates && (
              <div className="mt-6">
                <h3 className="mb-4 text-xl font-semibold">{t('home.location')}</h3>
                <Suspense
                  fallback={
                    <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted border" />
                  }
                >
                  <AppMap
                    lat={mapCoordinates.lat}
                    lng={mapCoordinates.lng}
                    zoom={15}
                    height="400px"
                    label={contactInfo?.address || t('home.defaultMapLabel')}
                  />
                </Suspense>
              </div>
            )}

            {/* CTA */}
            <div className="mt-8 flex justify-center">
              <Link to="/book" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="group h-12 w-full rounded-full bg-foreground px-8 text-base font-semibold text-background transition-all hover:bg-foreground/90 sm:h-14 sm:w-auto sm:text-lg"
                >
                  {t('home.bookNow')}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full border-t border-border bg-background px-4 py-12 sm:px-6 md:py-16 lg:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            {t('home.whyTitle')}
          </h2>
          <div className="grid gap-8 sm:gap-10 md:grid-cols-3 md:gap-12">
            {/* Feature 1 */}
            <div className="flex flex-col items-start space-y-3">
              <div className="rounded-2xl bg-foreground/5 p-3">
                <Calendar className="h-6 w-6 text-foreground sm:h-7 sm:w-7" />
              </div>
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                {t('home.feature1Title')}
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                {t('home.feature1Desc')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-start space-y-3">
              <div className="rounded-2xl bg-foreground/5 p-3">
                <Clock className="h-6 w-6 text-foreground sm:h-7 sm:w-7" />
              </div>
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                {t('home.feature2Title')}
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                {t('home.feature2Desc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-start space-y-3">
              <div className="rounded-2xl bg-foreground/5 p-3">
                <Sparkles className="h-6 w-6 text-foreground sm:h-7 sm:w-7" />
              </div>
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                {t('home.feature3Title')}
              </h3>
              <p className="text-sm text-foreground/70 sm:text-base">
                {t('home.feature3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final Section */}
      <section className="relative w-full border-t border-border bg-foreground py-16 text-center md:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-background sm:text-4xl md:text-5xl">
            {t('home.ctaTitle')}
          </h2>
          <p className="mb-8 text-base text-background/80 sm:text-lg md:text-xl">
            {t('home.ctaDesc')}
          </p>
          <Link to="/features">
            <Button
              size="lg"
              variant="secondary"
              className="group h-12 rounded-full bg-background px-8 text-base font-semibold text-foreground transition-all hover:bg-background/90 sm:h-14 sm:text-lg"
            >
              {t('home.ctaButton')}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
