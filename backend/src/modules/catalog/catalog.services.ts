import CreateServiceDto from "./catalog.types.js";

const createElement = async (serviceData: CreateServiceDto) => {
  try{
    
  } catch (error){
    console.error('Error al crear elemento: ', error);
    
    let errorMessage = 'Ocurrio un error al crear el elemento.';
    let statusCode = 500;

    
  }
}


export default {
  createElement
}