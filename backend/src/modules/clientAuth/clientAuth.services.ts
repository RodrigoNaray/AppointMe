import prisma from '../../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  RegisterClientDto,
  LoginClientDto,
  ClientJwtPayload,
  PublicClient,
  EmailVerificationResult,
  ChangeEmailRequestDto,
  EmailChangeResult,
} from './clientAuth.types';
import { ConflictError } from '../../utils/error';
import { JWT_SECRET, JWT_EXPIRATION } from '../../config/auth.config';
import { sendVerificationEmail, sendEmailChangeVerification } from '../../services/emailService';
import { generateTokenWithExpiration } from '../../utils/tokenUtils';
import logger from '../../utils/logger';

/**
 * Registra un nuevo cliente en la base de datos y envía email de verificación.
 * @param data - Datos del cliente para el registro.
 * @returns El objeto del cliente público (sin contraseña).
 */
export const registerClient = async (data: RegisterClientDto): Promise<PublicClient> => {
  // 1. Verificar si el email ya está en uso
  const existingClient = await prisma.client.findUnique({
    where: { email: data.email },
  });

  if (existingClient) {
    throw new ConflictError('El correo electrónico ya está en uso.');
  }

  // 2. Hashear la contraseña si se proporcionó una
  let passwordHash: string | undefined = undefined;
  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, 10);
  }

  // 3. Generar token de verificación de email
  const { token: verificationToken, expiration: verificationExpires } = generateTokenWithExpiration(24);

  // 4. Crear el nuevo cliente en la base de datos con datos de verificación
  const newClient = await prisma.client.create({
    data: {
      email: data.email,
      name: data.name,
      phone: data.phone,
      passwordHash,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    },
  });

  // 5. Enviar email de verificación de forma asíncrona
  try {
    const emailSent = await sendVerificationEmail({
      to: newClient.email,
      name: newClient.name,
      verificationToken: verificationToken,
    });

    if (emailSent) {
      logger.info({
        clientId: newClient.id, 
        email: newClient.email 
      }, 'Verification email sent successfully');
    } else {
      logger.warn({
        clientId: newClient.id, 
        email: newClient.email 
      }, 'Failed to send verification email');
    }
  } catch (error) {
    // No fallar el registro si el email no se puede enviar
    logger.error({
      clientId: newClient.id, 
      email: newClient.email,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Error sending verification email');
  }

  // 6. Omitir campos sensibles antes de devolver el objeto
  const { passwordHash: _, emailVerificationToken: __, ...publicClient } = newClient;
  return publicClient;
};

/**
 * Valida las credenciales de un cliente para el inicio de sesión.
 * @param data - Email y contraseña del cliente.
 * @returns El objeto del cliente público si las credenciales son válidas, de lo contrario null.
 */
export const validateClient = async (data: LoginClientDto): Promise<PublicClient | null> => {
  const client = await prisma.client.findUnique({
    where: { email: data.email },
  });

  if (!client || !client.passwordHash) {
    return null; // Usuario no encontrado o no tiene contraseña (se registró con Google)
  }

  const isPasswordValid = await bcrypt.compare(data.password, client.passwordHash);

  if (!isPasswordValid) {
    return null; // Contraseña incorrecta
  }

  const { passwordHash: _, emailVerificationToken: __, ...publicClient } = client;
  return publicClient;
};

/**
 * Genera un token JWT para una sesión de cliente.
 * @param client - El objeto del cliente público autenticado.
 * @returns Un string con el token JWT.
 */
export const generateClientToken = (client: PublicClient): string => {
  const payload: ClientJwtPayload = {
    sub: client.id,
    email: client.email,
    name: client.name,
    role: 'client', // Asignamos el rol explícitamente
  };

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET no está definida en las variables de entorno');
  }

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn:JWT_EXPIRATION // Damos a los clientes una sesión más larga
  });

  return token;
};

/**
 * Obtiene el perfil completo de un cliente por su ID.
 * @param clientId - ID del cliente.
 * @returns El objeto del cliente público con todos sus datos.
 */
export const getClientProfile = async (clientId: string): Promise<PublicClient | null> => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return null;
    }

    // Retornar cliente público sin datos sensibles
    const { passwordHash, emailVerificationToken, ...publicClient } = client;
    return publicClient;
  } catch (error) {
    logger.error({
      clientId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Error fetching client profile');
    throw error;
  }
};

/**
 * Verifica el email de un cliente usando el token de verificación.
 * @param token - Token de verificación enviado por email.
 * @returns Objeto con resultado de verificación y estado del cliente.
 */
export const verifyClientEmail = async (token: string): Promise<EmailVerificationResult> => {
  logger.info({ token: token.substring(0, 10) + '...' }, 'Attempting email verification');
  
  // Buscar cliente con el token de verificación pendiente
  const client = await prisma.client.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerified: false,
    },
  });

  if (!client) {
    // El token no existe o ya fue usado
    // Por seguridad OWASP, no revelamos si la cuenta existe o está verificada
    logger.warn({ token: token.substring(0, 10) + '...' }, 'Token not found - may be invalid, expired, or already used');
    return {
      success: false,
      alreadyVerified: false,
      message: 'Este link de verificación ya no es válido. Si ya verificaste tu cuenta, puedes iniciar sesión directamente.',
    };
  }

  // Verificar si el token ha expirado
  if (client.emailVerificationExpires && new Date() > client.emailVerificationExpires) {
    logger.warn({ 
      clientId: client.id, 
      expiration: client.emailVerificationExpires 
    }, 'Verification token has expired');
    return {
      success: false,
      alreadyVerified: false,
      message: 'El token de verificación ha expirado. Solicita un nuevo email de verificación.',
    };
  }

  // Actualizar cliente como verificado y limpiar datos de verificación
  const verifiedClient = await prisma.client.update({
    where: { id: client.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  logger.info({ clientId: verifiedClient.id }, 'Email verification successful');

  // Retornar cliente público (sin campos sensibles)
  const { passwordHash: _, emailVerificationToken: __, ...publicClient } = verifiedClient;
  return {
    success: true,
    alreadyVerified: false,
    client: publicClient,
    message: 'Email verificado exitosamente. Ya puedes iniciar sesión.',
  };
};

/**
 * Reenvía el email de verificación para un cliente autenticado.
 * OWASP: Usa clientId del JWT en lugar de email del body para prevenir enumeración de usuarios.
 * @param clientId - ID del cliente autenticado (extraído del JWT).
 * @returns true si el email se reenvió exitosamente, false si el cliente no existe o ya está verificado.
 */
export const resendVerificationEmail = async (clientId: string): Promise<boolean> => {
  // Buscar cliente por ID (proviene del JWT verificado)
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    logger.warn({ clientId }, 'Client not found for resend verification');
    return false;
  }

  if (client.emailVerified) {
    logger.info({ clientId }, 'Client email already verified');
    return false;
  }

  // Generar nuevo token de verificación
  const { token: verificationToken, expiration: verificationExpires } = generateTokenWithExpiration(24);

  // Actualizar cliente con nuevo token
  await prisma.client.update({
    where: { id: client.id },
    data: {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    },
  });

  // Enviar nuevo email de verificación
  try {
    const emailSent = await sendVerificationEmail({
      to: client.email,
      name: client.name,
      verificationToken: verificationToken,
    });

    if (emailSent) {
      logger.info({ clientId: client.id }, 'Verification email resent successfully');
      return true;
    } else {
      logger.warn({ clientId: client.id }, 'Failed to resend verification email');
      return false;
    }
  } catch (error) {
    logger.error({
      clientId: client.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Error resending verification email');
    return false;
  }
};

/**
 * Solicita cambio de email para un cliente autenticado (Paso 1)
 * OWASP: Requiere contraseña para confirmar identidad
 * @param clientId - ID del cliente autenticado
 * @param data - Nuevo email y contraseña de confirmación
 * @returns EmailChangeResult con éxito o error
 */
export const requestEmailChange = async (
  clientId: string,
  data: ChangeEmailRequestDto
): Promise<EmailChangeResult> => {
  // Buscar cliente por ID
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    logger.warn({ clientId }, 'Client not found');
    return {
      success: false,
      message: 'No se pudo procesar la solicitud.',
    };
  }

  // Bloquear cambio de email para usuarios de Google OAuth
  if (client.googleId) {
    logger.warn({ clientId, googleId: client.googleId }, 'Email change blocked for Google OAuth user');
    return {
      success: false,
      message: 'No puedes cambiar el email de una cuenta vinculada con Google.',
    };
  }

  if (!client.passwordHash) {
    logger.warn({ clientId }, 'Client has no password');
    return {
      success: false,
      message: 'No se pudo procesar la solicitud.',
    };
  }

  // Verificar contraseña para confirmar identidad
  const isPasswordValid = await bcrypt.compare(data.password, client.passwordHash);
  if (!isPasswordValid) {
    logger.warn({ clientId }, 'Invalid password for email change request');
    return {
      success: false,
      message: 'Contraseña incorrecta.',
    };
  }

  // Verificar que el nuevo email sea diferente
  if (data.newEmail.toLowerCase() === client.email.toLowerCase()) {
    return {
      success: false,
      message: 'El nuevo email debe ser diferente al actual.',
    };
  }

  // Verificar que el nuevo email no esté en uso por otro usuario
  const existingClient = await prisma.client.findUnique({
    where: { email: data.newEmail },
  });

  if (existingClient) {
    // Por seguridad OWASP, no revelar si el email está en uso
    logger.warn({ 
      clientId, 
      newEmail: data.newEmail 
    }, 'Email already in use by another client');
    return {
      success: false,
      message: 'No se pudo completar la solicitud. Intenta con otro email.',
    };
  }

  // Generar token de cambio de email
  const { token: emailChangeToken, expiration: emailChangeExpires } = generateTokenWithExpiration(24);

  // Guardar datos pendientes de cambio
  await prisma.client.update({
    where: { id: clientId },
    data: {
      pendingEmail: data.newEmail,
      emailChangeToken: emailChangeToken,
      emailChangeExpires: emailChangeExpires,
    },
  });

  // Enviar email de verificación al NUEVO email
  try {
    const emailSent = await sendEmailChangeVerification({
      to: client.email, // Notificar al email actual
      name: client.name,
      newEmail: data.newEmail,
      emailChangeToken: emailChangeToken,
    });

    if (emailSent) {
      logger.info({ clientId, newEmail: data.newEmail }, 'Email change verification sent');
      return {
        success: true,
        message: `Hemos enviado un email de verificación a ${data.newEmail}. Revisa tu bandeja de entrada.`,
      };
    } else {
      logger.warn({ clientId }, 'Failed to send email change verification');
      return {
        success: false,
        message: 'No se pudo enviar el email de verificación. Intenta nuevamente.',
      };
    }
  } catch (error) {
    logger.error({
      clientId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Error sending email change verification');
    return {
      success: false,
      message: 'Error al enviar el email de verificación.',
    };
  }
};

/**
 * Verifica y confirma el cambio de email (Paso 2)
 * @param token - Token de verificación recibido por email
 * @returns EmailChangeResult con éxito o error
 */
export const verifyEmailChange = async (token: string): Promise<EmailChangeResult> => {
  logger.info({ token: token.substring(0, 10) + '...' }, 'Attempting email change verification');

  // Buscar cliente con el token de cambio de email
  const client = await prisma.client.findFirst({
    where: {
      emailChangeToken: token,
    },
  });

  if (!client || !client.pendingEmail) {
    logger.warn({ token: token.substring(0, 10) + '...' }, 'Invalid email change token');
    return {
      success: false,
      message: 'Este link de verificación no es válido o ya fue usado.',
    };
  }

  // Verificar si el token ha expirado
  if (client.emailChangeExpires && new Date() > client.emailChangeExpires) {
    logger.warn({ 
      clientId: client.id, 
      expiration: client.emailChangeExpires 
    }, 'Email change token has expired');
    return {
      success: false,
      message: 'El token de verificación ha expirado. Solicita un nuevo cambio de email.',
    };
  }

  // Actualizar el email y limpiar datos pendientes
  try {
    await prisma.client.update({
      where: { id: client.id },
      data: {
        email: client.pendingEmail,
        pendingEmail: null,
        emailChangeToken: null,
        emailChangeExpires: null,
      },
    });

    logger.info({ clientId: client.id, newEmail: client.pendingEmail }, 'Email change successful');

    return {
      success: true,
      message: 'Email actualizado exitosamente. Por favor inicia sesión con tu nuevo email.',
    };
  } catch (error) {
    logger.error({
      clientId: client.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Error updating email');
    return {
      success: false,
      message: 'Error al actualizar el email. Intenta nuevamente.',
    };
  }
};

/**
 * Cambia la contraseña de un cliente autenticado.
 * @param clientId - ID del cliente autenticado.
 * @param data - Contraseña actual y nueva contraseña.
 * @returns Resultado de la operación.
 * 
 * Mejores prácticas implementadas:
 * - OWASP A02:2021: Verifica contraseña actual antes de cambiar (autenticación adicional)
 * - OWASP A07:2021: bcrypt con salt rounds = 10 (protección contra rainbow tables)
 * - Node.js: Manejo de errores con try-catch y logging
 * - TypeScript: Type-safe con interfaces
 */
export const changePassword = async (
  clientId: string,
  data: { currentPassword: string; newPassword: string }
): Promise<{ success: boolean; message: string }> => {
  try {
    // 1. Obtener cliente de la base de datos
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, passwordHash: true, email: true, googleId: true },
    });

    if (!client) {
      return {
        success: false,
        message: 'Cliente no encontrado.',
      };
    }

    // Caso especial: Usuario de Google OAuth sin contraseña (establecer primera contraseña)
    if (!client.passwordHash) {
      // Permitir establecer contraseña sin requerir la actual
      logger.info({ clientId, email: client.email }, 'Setting password for Google OAuth user');
      
      // Hashear la nueva contraseña (OWASP A07:2021)
      const newPasswordHash = await bcrypt.hash(data.newPassword, 10);

      // Establecer contraseña en la base de datos
      await prisma.client.update({
        where: { id: clientId },
        data: { passwordHash: newPasswordHash },
      });

      logger.info({ clientId, email: client.email }, 'Password set successfully for Google user');

      return {
        success: true,
        message: 'Contraseña establecida exitosamente. Ahora puedes usar email y contraseña para iniciar sesión.',
      };
    }

    // Caso normal: Usuario con contraseña existente (cambiar contraseña)
    // 2. Verificar que la contraseña actual sea correcta (OWASP A02:2021)
    const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, client.passwordHash);

    if (!isCurrentPasswordValid) {
      logger.warn({ clientId }, 'Failed password change attempt: incorrect current password');
      return {
        success: false,
        message: 'La contraseña actual es incorrecta.',
      };
    }

    // 3. Validar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(data.newPassword, client.passwordHash);
    
    if (isSamePassword) {
      return {
        success: false,
        message: 'La nueva contraseña debe ser diferente a la actual.',
      };
    }

    // 4. Hashear la nueva contraseña (OWASP A07:2021)
    const newPasswordHash = await bcrypt.hash(data.newPassword, 10);

    // 5. Actualizar contraseña en la base de datos
    await prisma.client.update({
      where: { id: clientId },
      data: { passwordHash: newPasswordHash },
    });

    logger.info({ clientId, email: client.email }, 'Password changed successfully');

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente.',
    };
  } catch (error) {
    logger.error({
      clientId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Error changing password');
    
    return {
      success: false,
      message: 'Error al cambiar la contraseña. Intenta nuevamente.',
    };
  }
};

/**
 * Actualiza el perfil de un cliente (phone, name, etc.).
 * @param clientId - ID del cliente a actualizar.
 * @param data - Datos a actualizar (puede incluir phone, name, etc.).
 * @returns El cliente actualizado sin datos sensibles.
 */
export const updateClientProfile = async (
  clientId: string,
  data: { phone?: string; name?: string }
): Promise<PublicClient> => {
  try {
    // Validar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new Error('Cliente no encontrado.');
    }

    // Actualizar el cliente
    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.name !== undefined && { name: data.name }),
      },
    });

    // Retornar cliente público sin datos sensibles
    return {
      id: updatedClient.id,
      email: updatedClient.email,
      name: updatedClient.name,
      phone: updatedClient.phone,
      emailVerified: updatedClient.emailVerified,
      googleId: updatedClient.googleId,
      emailVerificationExpires: updatedClient.emailVerificationExpires,
      pendingEmail: updatedClient.pendingEmail,
      emailChangeToken: updatedClient.emailChangeToken,
      emailChangeExpires: updatedClient.emailChangeExpires,
      createdAt: updatedClient.createdAt,
      updatedAt: updatedClient.updatedAt,
    };
  } catch (error) {
    logger.error({
      message: 'Error updating client profile',
      clientId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Error updating client profile');

    throw new Error('Error al actualizar el perfil. Intenta nuevamente.');
  }
};