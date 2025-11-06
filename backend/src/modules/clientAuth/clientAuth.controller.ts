import { Request, Response } from 'express';
import * as service from './clientAuth.services';
import { RegisterClientDto, LoginClientDto } from './clientAuth.types';
import {ACCESS_CLIENT_TOKEN_COOKIE_NAME, ACCESS_ADMIN_TOKEN_COOKIE_NAME, cookieOptions, clearCookieOptions} from '../../config/auth.config'
import logger from '../../utils/logger';

export const registerClientController = async (req: Request, res: Response) => {
  try {
    const clientData: RegisterClientDto = req.body;
    const newClient = await service.registerClient(clientData);
    logger.info({ clientId: newClient.id }, "Nuevo cliente registrado");
    res.status(201).json({ message: 'Cliente registrado exitosamente', client: newClient });
  } catch (error: any) {
    logger.error(error, "Error en el registro de cliente");
    if (error.name === 'ConflictError') {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const loginClientController = async (req: Request, res: Response) => {
  try {
    const loginData: LoginClientDto = req.body;
    const client = await service.validateClient(loginData);

    if (!client) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    // OWASP A01:2021 - Broken Access Control Prevention:
    // Invalidar sesión de admin si existe ANTES de crear sesión cliente
    // Previene sesiones simultáneas que podrían causar escalación de privilegios
    res.clearCookie(ACCESS_ADMIN_TOKEN_COOKIE_NAME, clearCookieOptions);

    const token = service.generateClientToken(client);

    // Configuramos la cookie para el cliente usando cookieOptions centralizadas
    res.cookie(ACCESS_CLIENT_TOKEN_COOKIE_NAME, token, cookieOptions);

    logger.info({ clientId: client.id }, "Login de cliente exitoso (sesión admin invalidada si existía)");
    res.status(200).json({ message: 'Inicio de sesión exitoso', client });
  } catch (error: any) {
    logger.error(error, "Error en el login de cliente");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const logoutClientController = (req: Request, res: Response) => {
  try{
    // OWASP Best Practice: clearCookie debe usar las mismas opciones que se usaron al crear la cookie (sin maxAge)
    res.clearCookie(ACCESS_CLIENT_TOKEN_COOKIE_NAME, clearCookieOptions);
    logger.info("Sesión de cliente cerrada");
    res.status(200).json({ message: 'Sesión cerrada exitosamente' });
  } catch (error: any) {
    logger.error(error, "Error en el logout de cliente");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getClientProfileController = async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string; email: string; name: string };
    
    if (!user) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    // Obtener perfil completo usando el servicio
    const client = await service.getClientProfile(user.id);

    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Devolver datos del usuario autenticado con googleId
    res.status(200).json({ 
      user: {
        id: client.id,
        email: client.email,
        name: client.name,
        phone: client.phone,
        googleId: client.googleId,
        type: 'client' as const
      }
    });
  } catch (error: any) {
    logger.error(error, "Error obteniendo perfil de cliente");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Actualizar perfil del cliente (ej: agregar teléfono después de Google OAuth)
 */
export const updateClientProfileController = async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string };
    const { phone } = req.body;

    if (!user) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    // Validar que el teléfono sea proporcionado
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ message: 'Teléfono es requerido' });
    }

    // Validación básica de formato (10-15 dígitos)
    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (!/^[0-9]{10,15}$/.test(cleanPhone)) {
      return res.status(400).json({ 
        message: 'Formato de teléfono inválido. Debe contener entre 10 y 15 dígitos' 
      });
    }

    // Actualizar en la base de datos
    const updatedClient = await service.updateClientProfile(user.id, { phone: cleanPhone });

    logger.info({ clientId: user.id }, 'Perfil de cliente actualizado');
    res.status(200).json({ 
      message: 'Perfil actualizado exitosamente',
      client: updatedClient
    });
  } catch (error: any) {
    logger.error(error, 'Error actualizando perfil de cliente');
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const verifyEmailController = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      logger.warn('Verification attempt without token');
      return res.status(400).json({ message: 'Token de verificación requerido' });
    }

    logger.info({ tokenPreview: token.substring(0, 10) + '...' }, 'Processing email verification');

    const result = await service.verifyClientEmail(token);

    if (!result.success) {
      logger.warn('Verification failed');
      return res.status(400).json({ 
        message: result.message,
        alreadyVerified: result.alreadyVerified
      });
    }

    logger.info({ 
      clientId: result.client?.id,
      alreadyVerified: result.alreadyVerified 
    }, "Email verification completed");
    
    res.status(200).json({ 
      message: result.message, 
      client: result.client,
      alreadyVerified: result.alreadyVerified
    });
  } catch (error: any) {
    logger.error(error, "Error en la verificación de email");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const resendVerificationController = async (req: Request, res: Response) => {
  try {
    // OWASP: Obtener clientId del JWT autenticado, no del body
    // req.user es asignado por isClientAuthenticated middleware
    // Ambos tipos (AdminUser y Client) tienen 'id' como campo
    const user = req.user as { id: string };
    const clientId = user?.id;

    if (!clientId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const emailSent = await service.resendVerificationEmail(clientId);

    if (!emailSent) {
      return res.status(400).json({ 
        message: 'No se pudo reenviar el email. Tu cuenta ya está verificada o hubo un error.' 
      });
    }

    logger.info({ clientId }, "Email de verificación reenviado");
    res.status(200).json({ 
      message: 'Email de verificación enviado exitosamente. Revisa tu bandeja de entrada.' 
    });
  } catch (error: any) {
    logger.error(error, "Error al reenviar verificación");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Solicita cambio de email para cliente autenticado (requiere contraseña)
 * OWASP: Requiere autenticación + contraseña para confirmar identidad
 */
export const requestEmailChangeController = async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string };
    const clientId = user?.id;

    if (!clientId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({ message: 'Email y contraseña requeridos' });
    }

    const result = await service.requestEmailChange(clientId, { newEmail, password });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    logger.info({ clientId }, "Email change request sent");
    res.status(200).json({ message: result.message });
  } catch (error: any) {
    logger.error(error, "Error requesting email change");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Verifica el token de cambio de email y actualiza el email
 */
export const verifyEmailChangeController = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Token de verificación requerido' });
    }

    const result = await service.verifyEmailChange(token);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    logger.info("Email change verified successfully");
    res.status(200).json({ message: result.message });
  } catch (error: any) {
    logger.error(error, "Error verifying email change");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Controller para cambiar la contraseña de un cliente autenticado.
 * 
 * Mejores prácticas:
 * - Express.js: Validación de body antes de procesar
 * - OWASP A02:2021: Usa req.user del middleware (requiere autenticación)
 * - Node.js: Logging de intentos de cambio de contraseña
 * - TypeScript: Type-safe con validaciones
 */
export const changePasswordController = async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string; email: string; name: string };
    
    if (!user) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { currentPassword, newPassword } = req.body;

    // Validaciones básicas
    // Nota: currentPassword puede ser vacío para usuarios de Google OAuth (sin passwordHash)
    if (typeof currentPassword !== 'string') {
      return res.status(400).json({ message: 'Contraseña actual requerida' });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'Nueva contraseña requerida' });
    }

    // Validación de longitud (OWASP A02:2021)
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    // Llamar al servicio
    const result = await service.changePassword(user.id, {
      currentPassword,
      newPassword,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    logger.info({ clientId: user.id }, "Password changed successfully");
    res.status(200).json({ message: result.message });
  } catch (error: any) {
    logger.error(error, "Error changing password");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Controller para manejar el callback de Google OAuth
 * OWASP A02:2021: El usuario ya fue autenticado por Passport
 * Genera JWT y establece cookie HttpOnly
 * 
 * Nota: returnUrl se maneja en el frontend usando sessionStorage (Zustand oauthStore)
 * El frontend guarda returnUrl antes de redirect a Google, y lo lee al volver
 */
export const googleCallbackController = (req: Request, res: Response) => {
  try {
    // req.user fue establecido por Passport después de autenticar con Google
    const user = req.user as any;

    if (!user) {
      logger.warn("Google OAuth callback sin usuario autenticado");
      return res.redirect(`${process.env.CLIENT_URL}/login?error=authentication_failed`);
    }

    // OWASP A01:2021: Invalidar sesión de admin si existe antes de crear sesión cliente
    res.clearCookie(ACCESS_ADMIN_TOKEN_COOKIE_NAME, clearCookieOptions);

    // Generar JWT token para el cliente
    const token = service.generateClientToken(user);

    // Establecer cookie HttpOnly con el token  
    res.cookie(ACCESS_CLIENT_TOKEN_COOKIE_NAME, token, cookieOptions);

    logger.info({ clientId: user.id, email: user.email }, "Cliente autenticado con Google OAuth");

    // Redireccionar al frontend home con flag de éxito
    // El frontend (HomePage) leerá returnUrl desde oauthStore (sessionStorage)
    res.redirect(`${process.env.CLIENT_URL}/?login=success`);
  } catch (error: any) {
    logger.error(error, "Error en callback de Google OAuth");
    res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
  }
};

/**
 * Controller para solicitar restablecimiento de contraseña
 * 
 * Justificación OWASP A01:2021 (Broken Access Control):
 * - Siempre retorna 200 para prevenir enumeración de usuarios
 * - Mensaje genérico no revela si email existe
 */
export const forgotPasswordController = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validar formato de email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    // Procesar solicitud (siempre retorna true por seguridad)
    await service.requestPasswordReset(email);

    // Mensaje genérico (no revelar si email existe)
    logger.info({ email: email.replace(/(.{2}).*(@.*)/, '$1***$2') }, 'Password reset requested');
    res.status(200).json({ 
      message: 'Si el email existe en nuestro sistema, recibirás instrucciones de recuperación.' 
    });
  } catch (error: any) {
    logger.error(error, 'Error en forgot password controller');
    // Retornar mensaje genérico incluso en error
    res.status(200).json({ 
      message: 'Si el email existe en nuestro sistema, recibirás instrucciones de recuperación.' 
    });
  }
};

/**
 * Controller para restablecer contraseña con token
 * 
 * Justificación OWASP A02:2021 (Cryptographic Failures):
 * - Validación de token en backend
 * - Password hasheado antes de almacenar
 */
export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    // Validar inputs
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Token inválido' });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'Contraseña inválida' });
    }

    // Intentar restablecer contraseña
    await service.resetPassword(token, newPassword);

    logger.info({ token: token.substring(0, 10) + '...' }, 'Password reset successful');
    res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error en reset password controller');
    
    // Retornar error específico (token expirado, password inválida, etc)
    res.status(400).json({ message: error.message || 'Error al restablecer contraseña' });
  }
};