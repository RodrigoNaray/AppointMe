import { useEffect, useState } from 'react';
import ContactInfoCard from '@/components/ContactInfoCard';
import type { ContactInfo } from '@/api/modules/settings';
import { getContactInfo } from '@/api/modules/settings';

export default function ContactPage() {
  const [contactInfo, setContactInfo] = useState<ContactInfo | undefined>();
  const [loadingContact, setLoadingContact] = useState(true);

  // Fetch contact info (misma lógica que HomePage para consistency)
  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const contact = await getContactInfo();
        setContactInfo(contact);
      } catch (error) {
        console.error('Error fetching contact info:', error);
        // Mantener undefined para mostrar fallback en ContactInfoCard
      } finally {
        setLoadingContact(false);
      }
    };
    fetchContactInfo();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Contacto</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Estamos aquí para ayudarte. ¡No dudes en contactarnos!
        </p>
      </div>

      {/* Contact Info Card */}
      <div className="max-w-2xl mx-auto">
        <ContactInfoCard contactInfo={contactInfo} isLoading={loadingContact} />
      </div>
    </div>
  );
}