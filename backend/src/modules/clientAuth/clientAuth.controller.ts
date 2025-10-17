import { Request, Response } from 'express';
import * as service from './clientAuth.services';
import { RegisterClientDto, LoginClientDto } from './clientAuth.types';
import {ACCESS_CLIENT_TOKEN_COOKIE_NAME, cookieOptions} from '../../config/auth.config'
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

    const token = service.generateClientToken(client);

    // Configuramos la cookie para el cliente usando cookieOptions centralizadas
    res.cookie(ACCESS_CLIENT_TOKEN_COOKIE_NAME, token, cookieOptions);

    logger.info({ clientId: client.id }, "Login de cliente exitoso");
    res.status(200).json({ message: 'Inicio de sesión exitoso', client });
  } catch (error: any) {
    logger.error(error, "Error en el login de cliente");
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const logoutClientController = (req: Request, res: Response) => {
  try{
    res.clearCookie(ACCESS_CLIENT_TOKEN_COOKIE_NAME);
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

    // Devolver datos del usuario autenticado
    res.status(200).json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        type: 'client' as const
      }
    });
  } catch (error: any) {
    logger.error(error, "Error obteniendo perfil de cliente");
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