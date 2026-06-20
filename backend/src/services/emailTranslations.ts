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
  en: {
    'app.name': 'AppointMePro',
    'verification.subject': 'Verify your email - AppointMePro',
    'verification.greeting': 'Welcome to AppointMePro!',
    'verification.body': 'Thank you for registering. To complete your registration, please verify your email.',
    'verification.cta': 'Verify Email',
    'verification.expiry': 'This verification link expires in 24 hours for security reasons.',
    'verification.ignore': 'If you did not register, you can safely ignore this email.',
    'email-change.subject': 'Confirm your new email - AppointMePro',
    'email-change.greeting': 'Confirm Email Change',
    'email-change.body': 'You have requested to change your email address to {newEmail}.',
    'email-change.cta': 'Confirm Email Change',
    'email-change.expiry': 'This link expires in 24 hours for security reasons.',
    'email-change.warning': 'If you did not request this change, ignore this email.',
    'booking-confirmed.subject': 'Booking Confirmation - AppointMePro',
    'booking-confirmed.greeting': 'Booking Confirmed',
    'booking-confirmed.hello': 'Hello {clientName},',
    'booking-confirmed.body': 'Your booking has been confirmed successfully.',
    'booking-confirmed.details': 'Booking details:',
    'booking-confirmed.service': 'Service',
    'booking-confirmed.datetime': 'Date & Time',
    'booking-confirmed.duration': 'Duration',
    'booking-confirmed.reminder': 'Please arrive 5 minutes before your first booking.',
    'booking-confirmed.manage': 'If you need to cancel or reschedule, you can do so from your profile.',
    'booking-confirmed.cta': 'View My Bookings',
    'password-reset.subject': 'Password Reset - AppointMePro',
    'password-reset.greeting': 'Password Reset',
    'password-reset.body': 'We received a request to reset your password.',
    'password-reset.cta': 'Reset Password',
    'password-reset.expiry': 'This link is valid for 24 hours.',
    'password-reset.security': 'If you did not request this, ignore this email.',
    'admin-cancellation.subject': 'Booking Cancelled - AppointMePro',
    'admin-cancellation.greeting': 'Booking Cancelled',
    'admin-cancellation.body': 'We regret to inform you that your booking has been cancelled by the establishment.',
    'admin-cancellation.reason': 'Reason',
    'admin-cancellation.cta': 'View My Bookings',
    'booking-rescheduled.subject': 'Booking Rescheduled - AppointMePro',
    'booking-rescheduled.greeting': 'Booking Rescheduled',
    'booking-rescheduled.body': 'Your booking has been rescheduled. Here are the updated details:',
    'booking-rescheduled.old-time': 'Previous date & time',
    'booking-rescheduled.new-time': 'New date & time',
    'booking-rescheduled.cta': 'View My Bookings',
    'client-cancellation.subject': 'Cancellation Confirmed - CheckMyPro',
    'client-cancellation.greeting': 'Cancellation Confirmed',
    'client-cancellation.body': 'Your booking has been successfully cancelled.',
    'client-cancellation.cta': 'Book Again',
    'footer.rights': '© 2025 AppointMePro. All rights reserved.',
    'footer.contact': 'Have questions? Contact us by replying to this email.',
    'min': 'min',
    'minutes': 'minutes',
    'service': 'Service',
    'duration': 'Duration',
  },
};

const getLangCode = (lang?: string): string => {
  if (lang === 'en' || lang === 'es') return lang;
  return 'es';
};

export const t = (key: string, lang?: string, params?: Record<string, string>): string => {
  const code = getLangCode(lang);
  let text = translations[code]?.[key] ?? translations['es']?.[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
};

export const getLanguageFromHeader = (acceptLanguage?: string): string => {
  if (!acceptLanguage) return 'es';
  if (acceptLanguage.startsWith('en')) return 'en';
  return 'es';
};

logger.info('Email translations loaded');
