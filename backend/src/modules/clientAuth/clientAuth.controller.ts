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