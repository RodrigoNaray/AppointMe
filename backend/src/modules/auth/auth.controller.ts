import { Request, Response } from 'express';
import { RegisterAdminDto, LoginAdminDto } from './auth.types';
import * as authServices from './auth.services';
import { ConflictError } from '../../utils/error';
import logger from '../../utils/logger';
import { cookieOptions, ACCESS_TOKEN_COOKIE_NAME } from '../../config/auth.config';



export const registerController = async ( req: Request<{},{}, RegisterAdminDto>, res: Response) => {
  try{

    const user = await authServices.registerUser(req.body);
    
    logger.info({ userId: user.id }, 'Nuevo usuario administrador registrado');
    res.status(201).json({message: 'Usuario registrado exitosamente', user });

  }catch(error){

    if (error instanceof ConflictError){
      logger.warn(error.message);
      return res.status(409).json({message: error.message});
    };

    logger.error(error, 'Error en el registro de usuario');
    res.status(500).json({ message: 'Error interno del servidor' });
  };
};

export const loginController = async ( req: Request<{},{},LoginAdminDto>, res: Response) => {
  try{

    const user = await authServices.validateUser(req.body);

    if(!user){

      logger.warn({ email: req.body.email }, 'Intento de login fallido');
      return res.status(401).json({message: 'Credenciales incorrecctas'})
    };

    const token = authServices.generateToken(user);

    res.cookie(ACCESS_TOKEN_COOKIE_NAME, token, cookieOptions);
    logger.info({ userId: user.id }, 'Inicio de sesión exitoso, token generado');
    res.status(200).json({ message: 'Inicio de sesión exitoso'});

  }catch(error){
    logger.error(error, 'Error en el inicio de sesión');
    res.status(500).json({ message: 'Error interno del servidor' });
  };
};

