import prisma from "../../config/prisma";
import { CreateServiceDto } from "./catalog.types";
import { ConflictError } from "../../utils/error";

const createElement = async (serviceData: CreateServiceDto) => {
    
  const existingService = await prisma.service.findFist({ where: { name: serviceData.name }});

  if (existingService) {
    throw new ConflictError(`Ya existe un servicio con el nombre '${serviceData.name}'.`);
  }

  const newService = await prisma.service.create({
    data: serviceData
  });

  return newService;
};



export default {
  createElement
}