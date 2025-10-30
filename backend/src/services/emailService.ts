import nodemailer from 'nodemailer';
import logger from "../utils/logger";

/**
 * CONFIGURACIÓN GMAIL:
 * 
 * Para usar Gmail, necesitas:
 * 1. Habilitar 2FA en tu cuenta Gmail
 * 2. Generar una "Contraseña de aplicación" específica:
 *    - Ve a tu cuenta Google > Seguridad > Verificación en 2 pasos > Contraseñas de aplicaciones
 *    - Genera una nueva contraseña para "Correo"
 *    - Usa esa contraseña de 16 caracteres en SMTP_PASS (no tu contraseña normal)
 * 
 * Variables de entorno requeridas:
 * - SMTP_HOST=smtp.gmail.com
 * - SMTP_PORT=587
 * - SMTP_SECURE=false
 * - SMTP_USER=tu-email@gmail.com
 * - SMTP_PASS=tu-contraseña-de-aplicacion (16 caracteres)
 */

// Configuración del transportador SMTP
const createTransporter = () => {
  // Validar configuración requerida
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.error('SMTP configuration incomplete: SMTP_USER and SMTP_PASS are required');
    throw new Error('SMTP configuration is incomplete');
  }

  // Log de configuración para debugging (sin exponer credenciales)
  logger.debug({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER?.replace(/(.{2}).*(@.*)/, '$1***$2') // Ocultar parte del email
  }, 'SMTP transporter configuration');

  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true para SSL (puerto 465), false para TLS (puerto 587)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Configuración TLS optimizada para Gmail
    tls: {
      // En desarrollo, ser más permisivo con certificados
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      minVersion: 'TLSv1.2' as const
    },
    // Configuración específica para Gmail
    requireTLS: true,
    connectionTimeout: 10000, // 10 segundos
    greetingTimeout: 5000, // 5 segundos
    socketTimeout: 10000 // 10 segundos
  };

  return nodemailer.createTransport(config);
};

// Interface para los datos del email de verificación
interface VerificationEmailData {
  to: string;
  name: string;
  verificationToken: string;
}

// Interface para los datos del email de cambio de email
interface EmailChangeData {
  to: string;
  name: string;
  newEmail: string;
  emailChangeToken: string;
}

/**
 * Envía un email de verificación al cliente recién registrado
 * @param data Datos necesarios para el email de verificación
 * @returns Promise<boolean> true si el email se envió exitosamente
 */
export const sendVerificationEmail = async (data: VerificationEmailData): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    // URL de verificación - usar CLIENT_URL del entorno
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${data.verificationToken}`;
    
    // Template HTML del email de verificación
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificación de Email - AppointMe</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">¡Bienvenido a AppointMe!</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hola ${data.name},</h2>
            
            <p>Gracias por registrarte en AppointMe. Para completar tu registro y comenzar a usar nuestra plataforma, necesitas verificar tu dirección de email.</p>
            
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
                Si no te registraste en AppointMe, puedes ignorar este email de forma segura.
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© 2025 AppointMe. Todos los derechos reservados.</p>
        </div>
    </body>
    </html>
    `;

    // Configuración del email
    const mailOptions = {
      from: {
        name: 'AppointMe',
        address: process.env.SMTP_USER!
      },
      to: data.to,
      subject: 'Verifica tu email - AppointMe',
      html: htmlTemplate,
      // Texto plano como fallback
      text: `
        ¡Bienvenido a AppointMe, ${data.name}!
        
        Para completar tu registro, verifica tu email haciendo clic en el siguiente enlace:
        ${verificationUrl}
        
        Este enlace expira en 24 horas.
        
        Si no te registraste en AppointMe, ignora este email.
        
        © 2025 AppointMe
      `
    };

    // Enviar el email
    const info = await transporter.sendMail(mailOptions);
    
    logger.info({
      messageId: info.messageId,
      to: data.to
    }, 'Verification email sent successfully');

    return true;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      to: data.to
    }, 'Failed to send verification email');
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
    const transporter = createTransporter();
    
    // URL de verificación de cambio de email
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email-change?token=${data.emailChangeToken}`;
    
    // Template HTML del email de cambio
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmar Cambio de Email - AppointMe</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Confirmar Cambio de Email</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hola ${data.name},</h2>
            
            <p>Has solicitado cambiar tu dirección de email en AppointMe a <strong>${data.newEmail}</strong>.</p>
            
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
            <p>© 2025 AppointMe. Todos los derechos reservados.</p>
        </div>
    </body>
    </html>
    `;

    // Configuración del email
    const mailOptions = {
      from: {
        name: 'AppointMe',
        address: process.env.SMTP_USER!
      },
      to: data.newEmail, // Enviar al NUEVO email para verificarlo
      subject: 'Confirma tu nuevo email - AppointMe',
      html: htmlTemplate,
      text: `
        Hola ${data.name},
        
        Has solicitado cambiar tu email en AppointMe a ${data.newEmail}.
        
        Para confirmar este cambio, haz clic en el siguiente enlace:
        ${verificationUrl}
        
        Este enlace expira en 24 horas.
        
        Si no solicitaste este cambio, ignora este email.
        
        © 2025 AppointMe
      `
    };

    // Enviar el email
    const info = await transporter.sendMail(mailOptions);
    
    logger.info({
      messageId: info.messageId,
      to: data.newEmail
    }, 'Email change verification sent successfully');

    return true;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      to: data.newEmail
    }, 'Failed to send email change verification');
    return false;
  }
};

// Interface para los datos del email de confirmación de reserva
interface BookingConfirmationData {
  to: string;
  clientName: string;
  bookings: Array<{
    serviceName: string;
    bookingTime: Date;
    durationMinutes: number;
  }>;
}

/**
 * Envía un email de confirmación de reserva(s) al cliente
 * @param data Datos de las reservas confirmadas
 * @returns Promise<boolean> true si el email se envió exitosamente
 */
export const sendBookingConfirmationEmail = async (data: BookingConfirmationData): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    // Formatear fecha/hora en zona horaria local (UTC-3 para Argentina)
    const formatDateTime = (date: Date) => {
      const localDate = new Date(date.getTime() - (3 * 60 * 60 * 1000)); // UTC-3
      const dateStr = localDate.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const timeStr = localDate.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return `${dateStr} a las ${timeStr}`;
    };

    // Generar filas HTML para cada reserva
    const bookingRows = data.bookings.map(booking => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${booking.serviceName}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${formatDateTime(booking.bookingTime)}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
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
        <title>Confirmación de Reserva - AppointMe</title>
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
                © 2025 AppointMe. Todos los derechos reservados.
            </p>
        </div>
    </body>
    </html>
    `;

    // Versión texto plano (fallback para clientes sin HTML)
    const textContent = `
Confirmación de Reserva - AppointMe

Hola ${data.clientName},

Tu${data.bookings.length > 1 ? 's' : ''} reserva${data.bookings.length > 1 ? 's han' : ' ha'} sido confirmada${data.bookings.length > 1 ? 's' : ''} exitosamente.

Detalles de la${data.bookings.length > 1 ? 's' : ''} reserva${data.bookings.length > 1 ? 's' : ''}:

${data.bookings.map(b => `- ${b.serviceName}\n  ${formatDateTime(b.bookingTime)}\n  Duración: ${b.durationMinutes} minutos\n`).join('\n')}

Recordatorio: Por favor, llega 5 minutos antes de tu primera reserva.

Si necesitas cancelar o reagendar, puedes hacerlo desde tu perfil en nuestra plataforma:
${process.env.CLIENT_URL}/client/profile

¿Tienes preguntas? Contáctanos respondiendo este email.

© 2025 AppointMe. Todos los derechos reservados.
    `.trim();

    const mailOptions = {
      from: `"AppointMe" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject: `✓ Confirmación de Reserva${data.bookings.length > 1 ? 's' : ''} - AppointMe`,
      text: textContent,
      html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);
    
    logger.info({
      to: data.to,
      bookingCount: data.bookings.length
    }, 'Booking confirmation email sent successfully');
    
    return true;
  } catch (error) {
    logger.error({
      error,
      to: data.to,
      bookingCount: data.bookings.length
    }, 'Failed to send booking confirmation email');
    return false;
  }
};

/**
 * Valida la configuración SMTP sin enviar un email
 * @returns Promise<boolean> true si la configuración es válida
 */
export const validateSMTPConfig = async (): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    logger.info('Testing SMTP connection...');
    await transporter.verify();
    logger.info('SMTP configuration is valid and connection successful');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    }, 'SMTP configuration validation failed');
    
    // Sugerencias específicas basadas en el error
    if (errorMessage.includes('self-signed certificate')) {
      logger.warn('Gmail certificate issue detected. Make sure you are using an App Password, not your regular Gmail password.');
    } else if (errorMessage.includes('authentication')) {
      logger.warn('Authentication failed. Verify SMTP_USER and SMTP_PASS are correct. For Gmail, use an App Password.');
    } else if (errorMessage.includes('timeout')) {
      logger.warn('Connection timeout. Check your internet connection and firewall settings.');
    }
    
    return false;
  }
};