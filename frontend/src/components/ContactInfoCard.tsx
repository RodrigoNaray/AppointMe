import { memo } from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import type { ContactInfo } from '@/api/modules/settings';

interface ContactInfoCardProps {
  contactInfo?: ContactInfo;
  isLoading?: boolean;
}

/**
 * Comparador personalizado para React.memo
 * Solo re-renderiza si contactInfo o isLoading cambian REALMENTE
 * 
 * Justificación React Best Practices (2025):
 * - Comparación profunda de objeto ContactInfo (3 campos)
 * - Evita re-renders cuando props son nuevas referencias pero mismo contenido
 * - Patrón consistente con BusinessHoursCard
 */
function arePropsEqual(
  prevProps: ContactInfoCardProps,
  nextProps: ContactInfoCardProps
): boolean {
  // Si isLoading cambió, re-renderizar
  if (prevProps.isLoading !== nextProps.isLoading) {
    return false;
  }

  // Si ambos son undefined/null, no re-renderizar
  if (!prevProps.contactInfo && !nextProps.contactInfo) {
    return true;
  }

  // Si uno es undefined y el otro no, re-renderizar
  if (!prevProps.contactInfo || !nextProps.contactInfo) {
    return false;
  }

  // Comparación profunda de cada campo
  return (
    prevProps.contactInfo.phone === nextProps.contactInfo.phone &&
    prevProps.contactInfo.email === nextProps.contactInfo.email &&
    prevProps.contactInfo.address === nextProps.contactInfo.address
  );
}

/**
 * ContactInfoCard - Componente para mostrar información de contacto del negocio
 * 
 * Features:
 * - Iconos descriptivos (Phone, Mail, MapPin) de lucide-react
 * - Links interactivos: tel:, mailto: (mejora UX mobile)
 * - Skeleton loading state
 * - Responsive design
 * 
 * Justificación UX (Nielsen's 10 Heuristics):
 * - #4 Consistency: Mismo diseño que BusinessHoursCard
 * - #6 Recognition: Iconos universales (teléfono, mail, mapa)
 * - #7 Flexibility: Links funcionan en desktop y mobile
 * 
 * Justificación Accessibility (WCAG 2.1):
 * - aria-label en links describe acción
 * - Color + iconos (no solo iconos para info)
 * - Focus visible en links interactivos
 * - Contraste mínimo 4.5:1
 * 
 * Justificación Code Quality:
 * - Defensive programming: valida datos antes de renderizar
 * - Type safety: TypeScript strict mode compatible
 * - DRY: renderContactRow reutilizable
 * - Performance: React.memo con comparación profunda previene re-renders
 */
function ContactInfoCard({ contactInfo, isLoading }: ContactInfoCardProps) {
  /**
   * Renderiza fila de contacto con icono y contenido
   * @param icon - Componente de icono Lucide
   * @param label - Etiqueta descriptiva (aria-label)
   * @param content - Contenido a mostrar (string o JSX)
   */
  const renderContactRow = (
    icon: React.ComponentType<{ className?: string }>,
    label: string,
    content: React.ReactNode
  ) => {
    const Icon = icon;
    return (
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 text-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
          {content}
        </div>
      </div>
    );
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-muted rounded animate-pulse" />
          <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 mt-0.5 bg-muted rounded animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-5 w-full bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Validación: contactInfo es requerido para renderizar contenido
  if (!contactInfo) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-6 h-6 text-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Información de Contacto</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          No se pudo cargar la información de contacto. Por favor, intenta más tarde.
        </p>
      </div>
    );
  }

  // Destructuring validado
  const { phone, email, address } = contactInfo;

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Phone className="w-6 h-6 text-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Información de Contacto</h3>
      </div>

      {/* Contact rows */}
      <div className="space-y-4">
        {/* Teléfono - Link interactivo (tel:) */}
        {renderContactRow(
          Phone,
          'Teléfono',
          <a
            href={`tel:${phone}`}
            className="text-foreground hover:text-foreground/80 transition-colors duration-200 text-sm"
            aria-label={`Llamar a ${phone}`}
          >
            {phone}
          </a>
        )}

        {/* Email - Link interactivo (mailto:) */}
        {renderContactRow(
          Mail,
          'Email',
          <a
            href={`mailto:${email}`}
            className="text-foreground hover:text-foreground/80 transition-colors duration-200 text-sm break-all"
            aria-label={`Enviar email a ${email}`}
          >
            {email}
          </a>
        )}

        {/* Dirección - Texto estático */}
        {renderContactRow(
          MapPin,
          'Dirección',
          <p className="text-foreground text-sm whitespace-pre-line">
            {address}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Exportar con React.memo y comparador personalizado
 * 
 * Justificación Performance:
 * - Previene re-renders cuando padre (HomePage/ContactPage) cambia estado
 * - Comparación profunda de 3 campos (phone, email, address)
 * - Mismo patrón que BusinessHoursCard (consistency)
 */
export default memo(ContactInfoCard, arePropsEqual);
