import { Resend } from 'resend';
import { formatInTimeZone } from 'date-fns-tz';
import logger from "../utils/logger";
import { t } from './emailTranslations';


const isEmailMocked = (): boolean => process.env.MOCK_EMAILS === 'true';

if (isEmailMocked()) {
  logger.warn('MOCK_EMAILS=true — all transactional emails will be suppressed and logged instead of sent via Resend. Do NOT use in production.');
}

if (!isEmailMocked()) {
  if (!process.env.RESEND_API_KEY) {
    logger.error('RESEND_API_KEY is not configured. Set it in .env file.');
    throw new Error('Missing required environment variable: RESEND_API_KEY');
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    logger.error('RESEND_FROM_EMAIL is not configured. Set it in .env file.');
    throw new Error('Missing required environment variable: RESEND_FROM_EMAIL');
  }
}

// Inicializar cliente Resend solo si no estamos mockeando
const resend = isEmailMocked() ? null : new Resend(process.env.RESEND_API_KEY ?? '');

// Email "from" garantizado por validación cuando no se mockea
const FROM_EMAIL: string = process.env.RESEND_FROM_EMAIL ?? 'mock@localhost';

interface DispatchEmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

const dispatchEmail = async (payload: DispatchEmailPayload) => {
  if (!resend) {
    throw new Error('Resend client not initialized — MOCK_EMAILS=true should have short-circuited the call');
  }
  return resend.emails.send(payload);
};

interface VerificationEmailData {
  to: string;
  name: string;
  verificationToken: string;
  clientLanguage?: string;
}

interface EmailChangeData {
  to: string;
  name: string;
  newEmail: string;
  emailChangeToken: string;
  clientLanguage?: string;
}


interface BookingConfirmationData {
  to: string;
  clientName: string;
  clientTimezone: string;
  bookings: Array<{
    serviceName: string;
    bookingTime: Date;
    durationMinutes: number;
  }>;
  clientLanguage?: string;
}

interface PasswordResetEmailData {
  to: string;
  name: string;
  resetToken: string;
  clientLanguage?: string;
}

interface AdminCancellationEmailData {
  to: string;
  clientName: string;
  serviceName: string;
  bookingTime: Date;
  durationMinutes: number;
  reason?: string;
  clientTimezone: string;
  clientLanguage?: string;
}

interface BookingRescheduledEmailData {
  to: string;
  clientName: string;
  serviceName: string;
  oldBookingTime: Date;
  newBookingTime: Date;
  durationMinutes: number;
  clientTimezone: string;
  clientLanguage?: string;
}

interface ClientCancellationEmailData {
  to: string;
  clientName: string;
  serviceName: string;
  bookingTime: Date;
  durationMinutes: number;
  clientTimezone: string;
  clientLanguage?: string;
}

/**
 * Envía un email de verificación al cliente recién registrado
 * @param data Datos necesarios para el email de verificación
 * @returns Promise<boolean> true si el email se envió exitosamente
 */
export const sendVerificationEmail = async (data: VerificationEmailData): Promise<boolean> => {
  if (isEmailMocked()) {
    logger.info({ to: data.to }, '[MOCK] Email suppressed (MOCK_EMAILS=true)');
    return true;
  }

  try {
    // URL de verificación - usar CLIENT_URL del entorno
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${data.verificationToken}`;
    
    // Template HTML del email de verificación (reutilizado de Nodemailer)
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificación de Email - AppointMePro</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">¡Bienvenido a AppointMePro!</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hola ${data.name},</h2>
            
            <p>Gracias por registrarte en AppointMePro. Para completar tu registro y comenzar a usar nuestra plataforma, necesitas verificar tu dirección de email.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Verificar Email
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:</p>
            <p style="background: #e9e9e9; padding: 10px; border-radius: 5px; font-size: 12px; word-break: break-all;">
                ${verificationUrl}
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
                <strong>Nota:</strong> Este enlace de verificación expira en 24 horas por motivos de seguridad.
            </p>
            
            <p style="color: #666; font-size: 14px;">
                Si no te registraste en AppointMePro, puedes ignorar este email de forma segura.
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© 2025 AppointMePro. Todos los derechos reservados.</p>
        </div>
    </body>
    </html>
    `;

    // Texto plano como fallback
    const textContent = `
¡Bienvenido a AppointMePro, ${data.name}!

Para completar tu registro, verifica tu email haciendo clic en el siguiente enlace:
${verificationUrl}

Este enlace expira en 24 horas.

Si no te registraste en AppointMePro, ignora este email.

© 2025 AppointMePro
    `.trim();

    const lang = data.clientLanguage;
    const result = await dispatchEmail({
      from: `AppointMePro <${FROM_EMAIL}>`,
      to: data.to,
      subject: t('verification.subject', lang),
      html: htmlTemplate,
      text: textContent,
    });

    // Resend retorna { data: { id: string } } en éxito, { error: ErrorObject } en fallo
    if (result.error) {
      throw new Error(result.error.message);
    }

    logger.info({
      messageId: result.data?.id,
      to: data.to.replace(/(.{2}).*(@.*)/, '$1***$2') // Ocultar parte del email por seguridad
    }, 'Verification email sent successfully via Resend');

    return true;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      to: data.to.replace(/(.{2}).*(@.*)/, '$1***$2')
    }, 'Failed to send verification email via Resend');
    return false;
  }
};

/**
 * Envía un email de verificación para cambio de email
 * @param data Datos necesarios para el email de cambio
 * @returns Promise<boolean> true si el email se envió exitosamente
 */
export const sendEmailChangeVerification = async (data: EmailChangeData): Promise<boolean> => {
  if (isEmailMocked()) {
    logger.info({ to: data.to }, '[MOCK] Email suppressed (MOCK_EMAILS=true)');
    return true;
  }

  try {
    // URL de verificación de cambio de email
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email-change?token=${data.emailChangeToken}`;
    
    // Template HTML del email de cambio (reutilizado de Nodemailer)
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmar Cambio de Email - AppointMePro</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Confirmar Cambio de Email</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hola ${data.name},</h2>
            
            <p>Has solicitado cambiar tu dirección de email en AppointMePro a <strong>${data.newEmail}</strong>.</p>
            
            <p>Para confirmar este cambio, haz clic en el botón de abajo:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Confirmar Cambio de Email
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:</p>
            <p style="background: #e9e9e9; padding: 10px; border-radius: 5px; font-size: 12px; word-break: break-all;">
                ${verificationUrl}
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
                <strong>Nota:</strong> Este enlace expira en 24 horas por motivos de seguridad.
            </p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-weight: bold;">⚠️ Importante:</p>
                <p style="margin: 5px 0 0 0; color: #856404;">
                    Si no solicitaste este cambio, ignora este email y tu dirección de email actual no será modificada.
                </p>
            </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© 2025 AppointMePro. Todos los derechos reservados.</p>
        </div>
    </body>
    </html>
    `;

    // Texto plano como fallback
    const textContent = `
Hola ${data.name},

Has solicitado cambiar tu email en AppointMePro a ${data.newEmail}.

Para confirmar este cambio, haz clic en el siguiente enlace:
${verificationUrl}

Este enlace expira en 24 horas.

Si no solicitaste este cambio, ignora este email.

© 2025 AppointMePro
    `.trim();

    const lang = data.clientLanguage;
    const result = await dispatchEmail({
      from: `AppointMePro <${FROM_EMAIL}>`,
      to: data.newEmail,
      subject: t('email-change.subject', lang),
      html: htmlTemplate,
      text: textContent,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    logger.info({
      messageId: result.data?.id,
      to: data.newEmail.replace(/(.{2}).*(@.*)/, '$1***$2')
    }, 'Email change verification sent successfully via Resend');

    return true;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      to: data.newEmail.replace(/(.{2}).*(@.*)/, '$1***$2')
    }, 'Failed to send email change verification via Resend');
    return false;
  }
};

/**
 * Envía un email de confirmación de reserva(s) al cliente
 * @param data Datos de las reservas confirmadas
 * @returns Promise<boolean> true si el email se envió exitosamente
 */
export const sendBookingConfirmationEmail = async (data: BookingConfirmationData): Promise<boolean> => {
  if (isEmailMocked()) {
    logger.info({ to: data.to, bookings: data.bookings.length }, '[MOCK] Email suppressed (MOCK_EMAILS=true)');
    return true;
  }

  try {
    /**
     * Formatea fecha/hora en el timezone del cliente
     * 
     * Justificación Node.js Best Practice:
     * - Usa date-fns-tz para conversión precisa de timezones (respeta DST)
     * - Formato neutral ISO-like: dd/MM/yyyy HH:mm (sin asumir idioma del cliente)
     * - Timezone dinámico: recibido desde frontend (navegador del usuario)
     * 
     * Justificación OWASP A04:2021 (Insecure Design):
     * - Validación implícita: date-fns-tz maneja timezones inválidos gracefully
     * - Sin hardcoding: ni timezone ni locale asumidos en backend
     * - Separation of concerns: frontend detecta, backend formatea
     */
    const formatDateTime = (date: Date, timezone: string): string => {
      // Formato neutral: "05/11/2025 14:30" (día/mes/año hora:minuto)
      return formatInTimeZone(date, timezone, 'dd/MM/yyyy HH:mm');
    };

    // Generar filas HTML para cada reserva
    const bookingRows = data.bookings.map(booking => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e8e6e0; color: #1a2744;">
          <strong>${booking.serviceName}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e8e6e0; color: #1a2744;">
          ${formatDateTime(booking.bookingTime, data.clientTimezone)}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e8e6e0; color: #8a8780;">
          ${booking.durationMinutes} min
        </td>
      </tr>
    `).join('');

    // Template HTML del email de confirmación
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Reserva - AppointMePro</title>
    </head>
    <body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; line-height: 1.6; color: #1a2744; max-width: 600px; margin: 0 auto; padding: 20px; background: #faf9f6;">
        <div style="background: #1a2744; color: #faf9f6; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Reserva Confirmada</h1>
        </div>
        
        <div style="background: #faf9f6; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e8e6e0; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">
                Hola <strong>${data.clientName}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
                Tu${data.bookings.length > 1 ? 's' : ''} reserva${data.bookings.length > 1 ? 's han' : ' ha'} sido confirmada${data.bookings.length > 1 ? 's' : ''} exitosamente. A continuación los detalles:
            </p>

            <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e8e6e0;">
              <thead>
                <tr style="background: #f5f4f0;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #1a2744; border-bottom: 1px solid #e8e6e0;">Servicio</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #1a2744; border-bottom: 1px solid #e8e6e0;">Fecha y Hora</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #1a2744; border-bottom: 1px solid #e8e6e0;">Duración</th>
                </tr>
              </thead>
              <tbody>
                ${bookingRows}
              </tbody>
            </table>

            <div style="background: #f0eeea; border-left: 4px solid #1a2744; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #1a2744;">
                    <strong>Recordatorio:</strong> Por favor, llega 5 minutos antes de tu primera reserva.
                </p>
            </div>

            <p style="font-size: 14px; color: #8a8780; margin-bottom: 20px;">
                Si necesitas cancelar o reagendar, puedes hacerlo desde tu perfil en nuestra plataforma.
            </p>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.CLIENT_URL}/client/bookings" 
                   style="display: inline-block; background: #1a2744; color: #faf9f6; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600;">
                    Ver Mis Reservas
                </a>
            </div>

            <p style="font-size: 14px; color: #8a8780; margin-top: 30px; text-align: center;">
                ¿Tienes preguntas? Contáctanos respondiendo este email.
            </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e8e6e0;">
            <p style="font-size: 12px; color: #8a8780;">
                © 2025 AppointMePro. Todos los derechos reservados.
            </p>
        </div>
    </body>
    </html>
    `;

    // Versión texto plano (fallback para clientes sin HTML)
    const textContent = `
Confirmación de Reserva - AppointMePro

Hola ${data.clientName},

Tu${data.bookings.length > 1 ? 's' : ''} reserva${data.bookings.length > 1 ? 's han' : ' ha'} sido confirmada${data.bookings.length > 1 ? 's' : ''} exitosamente.

Detalles de la${data.bookings.length > 1 ? 's' : ''} reserva${data.bookings.length > 1 ? 's' : ''}:

${data.bookings.map(b => `- ${b.serviceName}\n  ${formatDateTime(b.bookingTime, data.clientTimezone)}\n  Duración: ${b.durationMinutes} minutos\n`).join('\n')}

Recordatorio: Por favor, llega 5 minutos antes de tu primera reserva.

Si necesitas cancelar o reagendar, puedes hacerlo desde tu perfil en nuestra plataforma:
${process.env.CLIENT_URL}/client/bookings

¿Tienes preguntas? Contáctanos respondiendo este email.

© 2025 AppointMePro. Todos los derechos reservados.
    `.trim();

    const lang = data.clientLanguage;
    const result = await dispatchEmail({
      from: `AppointMePro <${FROM_EMAIL}>`,
      to: data.to,
      subject: `✓ ${t('booking-confirmed.subject', lang)}`,
      html: htmlTemplate,
      text: textContent,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    logger.info({
      messageId: result.data?.id,
      to: data.to.replace(/(.{2}).*(@.*)/, '$1***$2'),
      bookingCount: data.bookings.length
    }, 'Booking confirmation email sent successfully via Resend');
    
    return true;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      to: data.to.replace(/(.{2}).*(@.*)/, '$1***$2'),
      bookingCount: data.bookings.length
    }, 'Failed to send booking confirmation email via Resend');
    return false;
  }
};

/**
 * Envía un email de recuperación de contraseña
 * @param data Datos necesarios para el email de recuperación
 * @returns Promise<boolean> true si el email se envió exitosamente
 * 
 * Justificación OWASP A07:2021 (Identification and Authentication Failures):
 * - Token temporal con expiración de 24 horas previene abuso
 * - Link directo facilita UX sin comprometer seguridad
 * 
 * Justificación UX Best Practices:
 * - Diseño consistente con otros emails del sistema
 * - Información clara sobre expiración del token
 * - Alternativa de texto plano para clientes sin HTML
 */
export const sendPasswordResetEmail = async (data: PasswordResetEmailData): Promise<boolean> => {
  if (isEmailMocked()) {
    logger.info({ to: data.to }, '[MOCK] Email suppressed (MOCK_EMAILS=true)');
    return true;
  }

  try {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${data.resetToken}`;

    // Template HTML (diseño consistente con verificación de email)
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña - AppointMePro</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Recuperación de Contraseña</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hola ${data.name},</h2>
            
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en AppointMePro.</p>
            
            <p>Si fuiste tú quien solicitó este cambio, haz clic en el botón de abajo para crear una nueva contraseña:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Restablecer Contraseña
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:</p>
            <p style="background: #e9e9e9; padding: 10px; border-radius: 5px; font-size: 12px; word-break: break-all;">
                ${resetUrl}
            </p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-weight: bold;">⏰ Importante:</p>
                <p style="margin: 5px 0 0 0; color: #856404;">
                    Este enlace es válido por <strong>24 horas</strong>. Después de ese tiempo, deberás solicitar un nuevo enlace de recuperación.
                </p>
            </div>
            
            <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #721c24; font-weight: bold;">🔒 Seguridad:</p>
                <p style="margin: 5px 0 0 0; color: #721c24;">
                    Si no solicitaste restablecer tu contraseña, puedes ignorar este email de forma segura. Tu contraseña actual no será modificada.
                </p>
            </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© 2025 AppointMePro. Todos los derechos reservados.</p>
        </div>
    </body>
    </html>
    `;

    // Texto plano como fallback
    const textContent = `
Recuperación de Contraseña - AppointMePro

Hola ${data.name},

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en AppointMePro.

Para crear una nueva contraseña, haz clic en el siguiente enlace:
${resetUrl}

⏰ IMPORTANTE: Este enlace es válido por 24 horas.

🔒 SEGURIDAD: Si no solicitaste restablecer tu contraseña, ignora este email. Tu contraseña actual no será modificada.

© 2025 AppointMePro
    `.trim();

    const lang = data.clientLanguage;
    const result = await dispatchEmail({
      from: `AppointMePro <${FROM_EMAIL}>`,
      to: data.to,
      subject: t('password-reset.subject', lang),
      html: htmlTemplate,
      text: textContent,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    logger.info({
      messageId: result.data?.id,
      to: data.to.replace(/(.{2}).*(@.*)/, '$1***$2')
    }, 'Password reset email sent successfully via Resend');
    
    return true;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      to: data.to.replace(/(.{2}).*(@.*)/, '$1***$2')
    }, 'Failed to send password reset email via Resend');
    return false;
  }
};

/**
 * Envía un email al cliente cuando el admin cancela su reserva
 * @param data Datos del email de cancelación por admin
 * @returns Promise<boolean> true si el email se envió exitosamente
 */
export const sendAdminCancellationEmail = async (data: AdminCancellationEmailData): Promise<boolean> => {
  if (isEmailMocked()) {
    logger.info({ to: data.to, serviceName: data.serviceName }, '[MOCK] Email suppressed (MOCK_EMAILS=true)');
    return true;
  }

  try {
    const formatDateTime = (date: Date, timezone: string): string => {
      return formatInTimeZone(date, timezone, 'dd/MM/yyyy HH:mm');
    };

    const formattedTime = formatDateTime(data.bookingTime, data.clientTimezone);
    const reasonBlock = data.reason
      ? `
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>Motivo:</strong> ${data.reason}
          </p>
        </div>`
      : '';

    const reasonText = data.reason ? `\nMotivo: ${data.reason}\n` : '';

    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reserva Cancelada - AppointMePro</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Reserva Cancelada</h1>
        </div>

        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
                Hola <strong>${data.clientName}</strong>,
            </p>

            <p style="font-size: 16px; margin-bottom: 20px;">
                Lamentamos informarte que tu reserva ha sido cancelada por el establecimiento. Aquí están los detalles:
            </p>

            <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden; border-collapse: collapse; margin-bottom: 20px;">
              <tbody>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Servicio</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${data.serviceName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Fecha y Hora</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formattedTime}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: 600; color: #374151;">Duración</td>
                  <td style="padding: 12px;">${data.durationMinutes} min</td>
                </tr>
              </tbody>
            </table>

            ${reasonBlock}

            <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
                Si deseas reservar nuevamente, puedes hacerlo desde nuestra plataforma cuando lo desees.
            </p>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.CLIENT_URL}/client/bookings"
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Ver Mis Reservas
                </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
                ¿Tienes preguntas? Contáctanos respondiendo este email.
            </p>
        </div>

        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af;">
                © 2025 AppointMePro. Todos los derechos reservados.
            </p>
        </div>
    </body>
    </html>
    `;

    const textContent = `
Reserva Cancelada - AppointMePro

Hola ${data.clientName},

Lamentamos informarte que tu reserva ha sido cancelada por el establecimiento.

Detalles de la reserva cancelada:
- Servicio: ${data.serviceName}
- Fecha y Hora: ${formattedTime}
- Duración: ${data.durationMinutes} minutos
${reasonText}
Si deseas reservar nuevamente, puedes hacerlo desde nuestra plataforma:
${process.env.CLIENT_URL}/client/bookings

¿Tienes preguntas? Contáctanos respondiendo este email.

© 2025 AppointMePro
    `.trim();

    const lang = data.clientLanguage;
    const result = await dispatchEmail({
      from: `AppointMePro <${FROM_EMAIL}>`,
      to: data.to,
      subject: t('admin-cancellation.subject', lang),
      html: htmlTemplate,
      text: textContent,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    logger.info({
      messageId: result.data?.id,
      to: data.to.replace(/(.{2}).*(@.*)/, '$1***$2')
    }, 'Admin cancellation email sent successfully via Resend');

    return true;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      to: data.to.replace(/(.{2}).*(@.*)/, '$1***$2')
    }, 'Failed to send admin cancellation email via Resend');
    return false;
  }
};

/**
 * Envía un email al cliente cuando el admin reagenda su reserva
 * @param data Datos del email de reagendamiento
 * @returns Promise<boolean> true si el email se envió exitosamente
 */
export const sendBookingRescheduledEmail = async (data: BookingRescheduledEmailData): Promise<boolean> => {
  if (isEmailMocked()) {
    logger.info({ to: data.to, serviceName: data.serviceName }, '[MOCK] Email suppressed (MOCK_EMAILS=true)');
    return true;
  }

  try {
    const formatDateTime = (date: Date, timezone: string): string => {
      return formatInTimeZone(date, timezone, 'dd/MM/yyyy HH:mm');
    };

    const oldTime = formatDateTime(data.oldBookingTime, data.clientTimezone);
    const newTime = formatDateTime(data.newBookingTime, data.clientTimezone);

    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reserva Reagendada - AppointMePro</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Reserva Reagendada</h1>
        </div>

        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
                Hola <strong>${data.clientName}</strong>,
            </p>

            <p style="font-size: 16px; margin-bottom: 20px;">
                Tu reserva ha sido reagendada. Aquí están los detalles actualizados:
            </p>

            <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden; border-collapse: collapse; margin-bottom: 20px;">
              <tbody>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Servicio</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${data.serviceName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Fecha y hora anterior</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-decoration: line-through; color: #9ca3af;">${oldTime}</td>
                </tr>
                <tr style="background: #dbeafe;">
                  <td style="padding: 12px; font-weight: 600; color: #1e40af;">Nueva fecha y hora</td>
                  <td style="padding: 12px; color: #1e40af; font-weight: 600;">${newTime}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: 600; color: #374151;">Duración</td>
                  <td style="padding: 12px;">${data.durationMinutes} min</td>
                </tr>
              </tbody>
            </table>

            <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
                Si la nueva fecha y hora no te funcionan, por favor contáctanos para encontrar un horario alternativo.
            </p>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.CLIENT_URL}/client/bookings"
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Ver Mis Reservas
                </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
                ¿Tienes preguntas? Contáctanos respondiendo este email.
            </p>
        </div>

        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af;">
                © 2025 AppointMePro. Todos los derechos reservados.
            </p>
        </div>
    </body>
    </html>
    `;

    const textContent = `
Reserva Reagendada - AppointMePro

Hola ${data.clientName},

Tu reserva ha sido reagendada.

Detalles actualizados:
- Servicio: ${data.serviceName}
- Fecha y hora anterior: ${oldTime}
- Nueva fecha y hora: ${newTime}
- Duración: ${data.durationMinutes} minutos

Si la nueva fecha y hora no te funcionan, por favor contáctanos para encontrar un horario alternativo.

Ver mis reservas: ${process.env.CLIENT_URL}/client/bookings

¿Tienes preguntas? Contáctanos respondiendo este email.

© 2025 AppointMePro
    `.trim();

    const lang = data.clientLanguage;
    const result = await dispatchEmail({
      from: `AppointMePro <${FROM_EMAIL}>`,
      to: data.to,
      subject: t('booking-rescheduled.subject', lang),
      html: htmlTemplate,
      text: textContent,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    logger.info({
      messageId: result.data?.id,
      to: data.to.replace(/(.{2}).*(@.*)/, '$1***$2')
    }, 'Booking rescheduled email sent successfully via Resend');

    return true;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      to: data.to.replace(/(.{2}).*(@.*)/, '$1***$2')
    }, 'Failed to send booking rescheduled email via Resend');
    return false;
  }
};

export const sendClientCancellationEmail = async (data: ClientCancellationEmailData): Promise<boolean> => {
  if (isEmailMocked()) {
    logger.info({ to: data.to, serviceName: data.serviceName }, '[MOCK] Email suppressed (MOCK_EMAILS=true)');
    return true;
  }

  try {
    const formatDateTime = (date: Date, timezone: string): string => {
      return formatInTimeZone(date, timezone, 'dd/MM/yyyy HH:mm');
    };

    const formattedTime = formatDateTime(data.bookingTime, data.clientTimezone);

    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cancelación Confirmada - AppointMePro</title>
    </head>
    <body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; line-height: 1.6; color: #1a2744; max-width: 600px; margin: 0 auto; padding: 20px; background: #faf9f6;">
        <div style="background: #1a2744; color: #faf9f6; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Cancelación Confirmada</h1>
        </div>

        <div style="background: #faf9f6; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e8e6e0; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">
                Hola <strong>${data.clientName}</strong>,
            </p>

            <p style="font-size: 16px; margin-bottom: 20px;">
                Tu reserva ha sido cancelada exitosamente. Aquí están los detalles de la reserva cancelada:
            </p>

            <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e8e6e0;">
              <tbody>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e8e6e0; font-weight: 600; color: #1a2744;">Servicio</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e8e6e0;">${data.serviceName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e8e6e0; font-weight: 600; color: #1a2744;">Fecha y Hora</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e8e6e0;">${formattedTime}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: 600; color: #1a2744;">Duración</td>
                  <td style="padding: 12px;">${data.durationMinutes} min</td>
                </tr>
              </tbody>
            </table>

            <p style="font-size: 14px; color: #8a8780; margin-bottom: 20px;">
                Si deseas reservar nuevamente, puedes hacerlo desde nuestra plataforma cuando lo desees.
            </p>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.CLIENT_URL}/book"
                   style="display: inline-block; background: #1a2744; color: #faf9f6; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600;">
                    Reservar Nuevamente
                </a>
            </div>

            <p style="font-size: 14px; color: #8a8780; margin-top: 30px; text-align: center;">
                ¿Tienes preguntas? Contáctanos respondiendo este email.
            </p>
        </div>

        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e8e6e0;">
            <p style="font-size: 12px; color: #8a8780;">
                © 2025 AppointMePro. Todos los derechos reservados.
            </p>
        </div>
    </body>
    </html>
    `;

    const textContent = `
Cancelación Confirmada - AppointMePro

Hola ${data.clientName},

Tu reserva ha sido cancelada exitosamente.

Detalles de la reserva cancelada:
- Servicio: ${data.serviceName}
- Fecha y Hora: ${formattedTime}
- Duración: ${data.durationMinutes} minutos

Si deseas reservar nuevamente: ${process.env.CLIENT_URL}/book

¿Tienes preguntas? Contáctanos respondiendo este email.

© 2025 AppointMePro
    `.trim();

    const lang = data.clientLanguage;
    const result = await dispatchEmail({
      from: `AppointMePro <${FROM_EMAIL}>`,
      to: data.to,
      subject: t('client-cancellation.subject', lang),
      html: htmlTemplate,
      text: textContent,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    logger.info({
      messageId: result.data?.id,
      to: data.to.replace(/(.{2}).*(@.*)/, '$1***$2')
    }, 'Client cancellation email sent successfully via Resend');

    return true;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      to: data.to.replace(/(.{2}).*(@.*)/, '$1***$2')
    }, 'Failed to send client cancellation email via Resend');
    return false;
  }
};

// Log de configuración exitosa (sin exponer credenciales completas)
logger.info( 'Resend service initialized successfully');

// Warning si se está usando sandbox en producción
if (process.env.NODE_ENV === 'production' && FROM_EMAIL.includes('resend.dev')) {
  logger.warn('Using Resend sandbox domain in production. Verify your own domain for better deliverability.');
}
