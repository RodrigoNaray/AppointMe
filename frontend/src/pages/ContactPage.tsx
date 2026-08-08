import { useEffect, useState, lazy, Suspense } from 'react';
import { MapPin } from 'lucide-react';
import ContactInfoCard from '@/components/ContactInfoCard';
import BusinessHoursCard from '@/components/BusinessHoursCard';
import type { ContactInfo, BusinessHours } from '@/api/modules/settings';
import { getContactInfo, getBusinessHours } from '@/api/modules/settings';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { geocodeAddress, type GeocodingResult } from '@/lib/geocoding';
import { usePageTitle } from "@/hooks/usePageTitle";

const AppMap = lazy(() => import("@/components/ui/AppMap").then(module => ({ default: module.AppMap })));

export default function ContactPage() {
  usePageTitle("Contacto — AppointMePro");
  const [contactInfo, setContactInfo] = useState<ContactInfo | undefined>();
  const [loadingContact, setLoadingContact] = useState(true);
  const [businessHours, setBusinessHours] = useState<BusinessHours | undefined>();
  const [loadingHours, setLoadingHours] = useState(true);
  const [mapCoordinates, setMapCoordinates] = useState<GeocodingResult | null>(null);

  const contactReveal = useScrollReveal(0.1);
  const hoursReveal = useScrollReveal(0.1);
  const mapReveal = useScrollReveal(0.1);

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
          console.error('[ContactPage] Geocoding error:', error);
          setMapCoordinates(null);
        });
    }
  }, [contactInfo]);

  return (
    <div className="bg-background">
      {/* Contact Info Section */}
      <section className="w-full border-b border-border bg-background">
        <div ref={contactReveal.ref} className={`mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10 ${contactReveal.isVisible ? 'visible' : ''} animate-reveal`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Contacto
            </h2>
          </div>
          <div className="max-w-2xl">
            <ContactInfoCard contactInfo={contactInfo} isLoading={loadingContact} />
          </div>
        </div>
      </section>

      {/* Business Hours Section */}
      <section className="w-full border-b border-border bg-background">
        <div ref={hoursReveal.ref} className={`mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10 ${hoursReveal.isVisible ? 'visible' : ''} animate-reveal`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Horarios de Atención
            </h2>
          </div>
          <div className="max-w-2xl">
            <BusinessHoursCard businessHours={businessHours} isLoading={loadingHours} />
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="w-full border-b border-border bg-background">
        <div ref={mapReveal.ref} className={`mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10 ${mapReveal.isVisible ? 'visible' : ''} animate-reveal`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Ubicación
            </h2>
          </div>
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
