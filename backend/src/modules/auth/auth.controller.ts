import { Request, Response } from 'express';
import { RegisterAdminDto, LoginAdminDto, ChangePasswordDto } from './auth.types';
import * as authServices from './auth.services';
import logger from '../../utils/logger';
import { cookieOptions, clearCookieOptions, ACCESS_ADMIN_TOKEN_COOKIE_NAME, ACCESS_CLIENT_TOKEN_COOKIE_NAME } from '../../config/auth.config';


export const loginController = async ( req: Request<{},{},LoginAdminDto>, res: Response) => {
  try{

    const user = await authServices.validateUser(req.body);

    if(!user){

      logger.warn('Intento de login fallido');
      return res.status(401).json({message: 'Credenciales incorrecctas'})
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
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword and newPassword are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
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
