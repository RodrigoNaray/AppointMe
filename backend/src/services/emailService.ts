import { Resend } from 'resend';
import { formatInTimeZone } from 'date-fns-tz';
import logger from "../utils/logger";


if (!process.env.RESEND_API_KEY) {
  logger.error('RESEND_API_KEY is not configured. Set it in .env file.');
  throw new Error('Missing required environment variable: RESEND_API_KEY');
}

if (!process.env.RESEND_FROM_EMAIL) {
  logger.error('RESEND_FROM_EMAIL is not configured. Set it in .env file.');
  throw new Error('Missing required environment variable: RESEND_FROM_EMAIL');
}

// Inicializar cliente Resend (solo si validación pasó)
const resend = new Resend(process.env.RESEND_API_KEY);

// Email "from" garantizado por validación
const FROM_EMAIL: string = process.env.RESEND_FROM_EMAIL;

interface VerificationEmailData {
  to: string;
  name: string;
  verificationToken: string;
}

interface EmailChangeData {
  to: string;
  name: string;
  newEmail: string;
  emailChangeToken: string;
}


interface BookingConfirmationData {
  to: string;
  clientName: string;
  clientTimezone: string; // IANA timezone (ej: 'America/Argentina/Buenos_Aires')
  bookings: Array<{
    serviceName: string;
    bookingTime: Date;
    durationMinutes: number;
  }>;
}

/**
 * Envía un email de verificación al cliente recién registrado
 * @param data Datos necesarios para el email de verificación
 * @returns Promise<boolean> true si el email se envió exitosamente
 */
export const sendVerificationEmail = async (data: VerificationEmailData): Promise<boolean> => {
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

    // Enviar email con Resend
    const result = await resend.emails.send({
      from: `AppointMePro <${FROM_EMAIL}>`,
      to: data.to,
      subject: 'Verifica tu email - AppointMePro',
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

    // Enviar email con Resend al NUEVO email para verificarlo
    const result = await resend.emails.send({
      from: `AppointMePro <${FROM_EMAIL}>`,
      to: data.newEmail,
      subject: 'Confirma tu nuevo email - AppointMePro',
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
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${booking.serviceName}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${formatDateTime(booking.bookingTime, data.clientTimezone)}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${booking.durationMinutes} min
        </td>
      </tr>
    `).join('');

    // Template HTML del email de confirmación (reutilizado de Nodemailer)
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Reserva - AppointMePro</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">✓ Reserva Confirmada</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
                Hola <strong>${data.clientName}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
                Tu${data.bookings.length > 1 ? 's' : ''} reserva${data.bookings.length > 1 ? 's han' : ' ha'} sido confirmada${data.bookings.length > 1 ? 's' : ''} exitosamente. A continuación los detalles:
            </p>

            <table style="width: 100%; background: white; border-radius: 8px; overflow: hidden; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Servicio</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Fecha y Hora</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Duración</th>
                </tr>
              </thead>
              <tbody>
                ${bookingRows}
              </tbody>
            </table>

            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #1e40af;">
                    <strong>Recordatorio:</strong> Por favor, llega 5 minutos antes de tu primera reserva.
                </p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
                Si necesitas cancelar o reagendar, puedes hacerlo desde tu perfil en nuestra plataforma.
            </p>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.CLIENT_URL}/client/profile" 
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

    // Versión texto plano (fallback para clientes sin HTML)
    const textContent = `
Confirmación de Reserva - AppointMePro

Hola ${data.clientName},

Tu${data.bookings.length > 1 ? 's' : ''} reserva${data.bookings.length > 1 ? 's han' : ' ha'} sido confirmada${data.bookings.length > 1 ? 's' : ''} exitosamente.

Detalles de la${data.bookings.length > 1 ? 's' : ''} reserva${data.bookings.length > 1 ? 's' : ''}:

${data.bookings.map(b => `- ${b.serviceName}\n  ${formatDateTime(b.bookingTime, data.clientTimezone)}\n  Duración: ${b.durationMinutes} minutos\n`).join('\n')}

Recordatorio: Por favor, llega 5 minutos antes de tu primera reserva.

Si necesitas cancelar o reagendar, puedes hacerlo desde tu perfil en nuestra plataforma:
${process.env.CLIENT_URL}/client/profile

¿Tienes preguntas? Contáctanos respondiendo este email.

© 2025 AppointMePro. Todos los derechos reservados.
    `.trim();

    // Enviar email con Resend
    const result = await resend.emails.send({
      from: `AppointMePro <${FROM_EMAIL}>`,
      to: data.to,
      subject: `✓ Confirmación de Reserva${data.bookings.length > 1 ? 's' : ''} - AppointMePro`,
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

// Log de configuración exitosa (sin exponer credenciales completas)
logger.info({
  apiKeyPrefix: process.env.RESEND_API_KEY.substring(0, 10) + '...',
  fromEmail: FROM_EMAIL,
  isSandbox: FROM_EMAIL.includes('resend.dev')
}, 'Resend service initialized successfully');

// Warning si se está usando sandbox en producción
if (process.env.NODE_ENV === 'production' && FROM_EMAIL.includes('resend.dev')) {
  logger.warn('Using Resend sandbox domain in production. Verify your own domain for better deliverability.');
}
