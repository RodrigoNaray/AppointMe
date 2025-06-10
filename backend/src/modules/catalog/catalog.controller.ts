import { Request, Response } from "express"
import catalogServices from "./catalog.services";
import CreateServiceDto from "./catalog.types.js";

const createElement = async (req: Request, res: Response) => {
  try{
    const serviceData: CreateServiceDto = req.body
    const service = await catalogServices.createElement(serviceData);

    res.status(201).json(service)
  } catch (error){
    console.error('Error al crear elemento: ', error);
    
    let errorMessage = 'Ocurrio un error al crear el elemento.';
    let statusCode = 500;

    res.status(statusCode).json({ message: "Error al crear elmento.", error: errorMessage})
  }
}

export default{
  createElement
}