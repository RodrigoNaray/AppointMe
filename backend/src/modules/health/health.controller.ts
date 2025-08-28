import { Request , Response } from 'express'
import * as healthServices from './health.services'
import logger from '../../utils/logger'

export const checkHealth = async ( req: Request, res: Response) => {
    try{
        const health = await healthServices.getStatus();
        res.status(200).json(health);
    } catch (error){
        logger.error(error, "Error al obtener los servicios de Health");
        res.status(500).json({message: 'Error interno del servidor'})
    }
};