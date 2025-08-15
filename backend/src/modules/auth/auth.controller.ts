import { Request, Response } from 'express';
import { RegisterAdminDto, LoginAdminDto } from './auth.types';
import * as authServices from './auth.services';
import logger from '../../utils/logger';
import { cookieOptions, ACCESS_ADMIN_TOKEN_COOKIE_NAME } from '../../config/auth.config';


export const loginController = async ( req: Request<{},{},LoginAdminDto>, res: Response) => {
  try{

    const user = await authServices.validateUser(req.body);

    if(!user){

      logger.warn({ email: req.body.email }, 'Intento de login fallido');
      return res.status(401).json({message: 'Credenciales incorrecctas'})
    };

    const token = authServices.generateToken(user);

    res.cookie(ACCESS_ADMIN_TOKEN_COOKIE_NAME, token, cookieOptions);
    logger.info({ userId: user.id }, 'Inicio de sesión exitoso, token generado');
    res.status(200).json({ message: 'Inicio de sesión exitoso'});

  }catch(error){
    logger.error(error, 'Error en el inicio de sesión');
    res.status(500).json({ message: 'Error interno del servidor' });
  };
};

export const logoutController = async ( req: Request, res: Response) => {

  res.clearCookie(ACCESS_ADMIN_TOKEN_COOKIE_NAME);
  res.status(200).json({ message: 'Sesión cerrada exitosamente' });
};

export const getProfileController = async ( req: Request, res: Response) => {
    res.status(200).json({ user: req.user });
};
