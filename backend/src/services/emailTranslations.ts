import logger from "../utils/logger";

const translations: Record<string, Record<string, string>> = {
  es: {
    'app.name': 'AppointMePro',
    'verification.subject': 'Verifica tu email - AppointMePro',
    'verification.greeting': '¡Bienvenido a AppointMePro!',
    'verification.body': 'Gracias por registrarte. Para completar tu registro, verifica tu email.',
    'verification.cta': 'Verificar Email',
    'verification.expiry': 'Este enlace de verificación expira en 24 horas por motivos de seguridad.',
    'verification.ignore': 'Si no te registraste, puedes ignorar este email.',
    'email-change.subject': 'Confirma tu nuevo email - AppointMePro',
    'email-change.greeting': 'Confirmar Cambio de Email',
    'email-change.body': 'Has solicitado cambiar tu dirección de email a {newEmail}.',
    'email-change.cta': 'Confirmar Cambio de Email',
    'email-change.expiry': 'Este enlace expira en 24 horas por motivos de seguridad.',
    'email-change.warning': 'Si no solicitaste este cambio, ignora este email.',
    'booking-confirmed.subject': 'Confirmación de Reserva',
    'booking-confirmed.greeting': 'Reserva Confirmada',
    'booking-confirmed.hello': 'Hola {clientName},',
    'booking-confirmed.body': 'Tu reserva ha sido confirmada exitosamente.',
    'booking-confirmed.details': 'Detalles de la reserva:',
    'booking-confirmed.service': 'Servicio',
    'booking-confirmed.datetime': 'Fecha y Hora',
    'booking-confirmed.duration': 'Duración',
    'booking-confirmed.reminder': 'Por favor, llega 5 minutos antes de tu primera reserva.',
    'booking-confirmed.manage': 'Si necesitas cancelar o reagendar, hazlo desde tu perfil.',
    'booking-confirmed.cta': 'Ver Mis Reservas',
    'password-reset.subject': 'Recuperación de Contraseña - AppointMePro',
    'password-reset.greeting': 'Recuperación de Contraseña',
    'password-reset.body': 'Recibimos una solicitud para restablecer tu contraseña.',
    'password-reset.cta': 'Restablecer Contraseña',
    'password-reset.expiry': 'Este enlace es válido por 24 horas.',
    'password-reset.security': 'Si no solicitaste esto, ignora este email.',
    'admin-cancellation.subject': 'Reserva Cancelada - AppointMePro',
    'admin-cancellation.greeting': 'Reserva Cancelada',
    'admin-cancellation.body': 'Lamentamos informarte que tu reserva ha sido cancelada por el establecimiento.',
    'admin-cancellation.reason': 'Motivo',
    'admin-cancellation.cta': 'Ver Mis Reservas',
    'booking-rescheduled.subject': 'Reserva Reagendada - AppointMePro',
    'booking-rescheduled.greeting': 'Reserva Reagendada',
    'booking-rescheduled.body': 'Tu reserva ha sido reagendada. Aquí están los detalles actualizados:',
    'booking-rescheduled.old-time': 'Fecha y hora anterior',
    'booking-rescheduled.new-time': 'Nueva fecha y hora',
    'booking-rescheduled.cta': 'Ver Mis Reservas',
    'client-cancellation.subject': 'Cancelación Confirmada - AppointMePro',
    'client-cancellation.greeting': 'Cancelación Confirmada',
    'client-cancellation.body': 'Tu reserva ha sido cancelada exitosamente.',
    'client-cancellation.cta': 'Reservar Nuevamente',
    'footer.rights': '© 2025 AppointMePro. Todos los derechos reservados.',
    'footer.contact': '¿Tienes preguntas? Contáctanos respondiendo este email.',
    'min': 'min',
    'minutes': 'minutos',
    'service': 'Servicio',
    'duration': 'Duración',
  },
};

const getLangCode = (_lang?: string): string => 'es';

export const t = (key: string, _lang?: string, params?: Record<string, string>): string => {
  const code = getLangCode(_lang);
  let text = translations[code]?.[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
};

logger.info('Email translations loaded');
