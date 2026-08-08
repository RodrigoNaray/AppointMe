import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma';
import { RegisterAdminDto, LoginAdminDto, ChangePasswordDto, UpdateAdminProfileDto } from './auth.types';
import * as authServices from './auth.services';
import logger from '../../utils/logger';
import { cookieOptions, clearCookieOptions, ACCESS_ADMIN_TOKEN_COOKIE_NAME, ACCESS_CLIENT_TOKEN_COOKIE_NAME, JWT_SECRET } from '../../config/auth.config';


export const loginController = async ( req: Request<{},{},LoginAdminDto>, res: Response) => {
  try{

    if (!req.body.email || typeof req.body.email !== 'string' || !req.body.email.includes('@')) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    if (!req.body.password || typeof req.body.password !== 'string') {
      return res.status(400).json({ message: 'Contraseña requerida' });
    }

    const user = await authServices.validateUser(req.body);

    if(!user){

      logger.warn('Intento de login fallido');
      return res.status(401).json({message: 'Credenciales incorrectas'})
    };

    // OWASP A01:2021 - Broken Access Control Prevention:
    // Invalidar sesión de cliente si existe ANTES de crear sesión admin
    // Previene sesiones simultáneas que podrían causar escalación de privilegios
    res.clearCookie(ACCESS_CLIENT_TOKEN_COOKIE_NAME, clearCookieOptions);

    const token = authServices.generateToken(user);

    res.cookie(ACCESS_ADMIN_TOKEN_COOKIE_NAME, token, cookieOptions);
    logger.info({ userId: user.id }, 'Inicio de sesión de admin exitoso (sesión cliente invalidada si existía)');
    res.status(200).json({ message: 'Inicio de sesión exitoso'});

  }catch(error){
    logger.error(error, 'Error en el inicio de sesión');
    res.status(500).json({ message: 'Error interno del servidor' });
  };
};

export const logoutController = async ( req: Request, res: Response) => {
  // OWASP Best Practice: clearCookie debe usar las mismas opciones que se usaron al crear la cookie (sin maxAge)
  // Invalidar la sesión server-side incrementando tokenVersion (el JWT queda sin efecto aunque se haya filtrado)
  const token = (req as Request & { signedCookies?: Record<string, string> }).signedCookies?.[ACCESS_ADMIN_TOKEN_COOKIE_NAME];
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { sub?: string };
      if (payload.sub) {
        await prisma.adminUser.update({
          where: { id: payload.sub },
          data: { tokenVersion: { increment: 1 } },
        });
      }
    } catch {
      // Token inválido o expirado: no hay sesión que invalidar
    }
  }
  res.clearCookie(ACCESS_ADMIN_TOKEN_COOKIE_NAME, clearCookieOptions);
  logger.info("Sesión de administrador cerrada");
  res.status(200).json({ message: 'Sesión cerrada exitosamente' });
};

export const getProfileController = async ( req: Request, res: Response) => {
    res.status(200).json({ user: req.user });
};

export const changePasswordController = async ( req: Request<{}, {}, ChangePasswordDto>, res: Response) => {
  try {
    const admin = req.user as { id: string };
    if (!admin?.id) {
      return res.status(401).json({ message: 'Autenticación requerida' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword y newPassword son requeridos' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
    }

    await authServices.changeAdminPassword(admin.id, req.body);
    logger.info({ adminId: admin.id }, 'Admin password changed via API');
    res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    const status = message === 'Contraseña actual incorrecta' ? 400 : 500;
    logger.error({ error }, 'Error in changePasswordController');
    res.status(status).json({ message });
  }
};

export const updateProfileController = async (req: Request<{}, {}, UpdateAdminProfileDto>, res: Response) => {
  try {
    const admin = req.user as { id: string };
    if (!admin?.id) {
      return res.status(401).json({ message: 'Autenticación requerida' });
    }

    const { name } = req.body;
    if (typeof name !== 'string' || name.length > 100) {
      return res.status(400).json({ message: 'Nombre inválido' });
    }

    const updated = await authServices.updateAdminProfile(admin.id, { name });
    logger.info({ adminId: admin.id }, 'Admin profile updated via API');
    res.status(200).json({ success: true, user: updated });
  } catch (error) {
    logger.error({ error }, 'Error in updateProfileController');
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
