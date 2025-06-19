import { Request, Response } from "express"
import servicesServices from "./services.services";
import { CreateServiceDto } from "./services.types";
import { ConflictError } from "../../utils/error";
import logger from "../../utils/logger";



const createElement = async (req: Request, res: Response) => {
  try{
    const serviceData: CreateServiceDto = req.body;
    const service = await servicesServices.createElement(serviceData);

    res.status(201).json(service);
  } catch (error){
    
    if (error instanceof ConflictError) {
      logger.warn(error.message);
      return res.status(409).json({ message: error.message}); // 409 Conflict
    }
    
    logger.error(error, 'Ocurrio un error inesperado al crear el servicio.');
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};

export default{
  createElement
};