import { Router } from "express";
import * as servicesController from "./services.controller";

const servicesRoutes: Router = Router();

servicesRoutes.get('/',servicesController.findAll)
servicesRoutes.get('/:id',servicesController.findOne)
servicesRoutes.post('/', servicesController.create)
servicesRoutes.put('/update/:id',servicesController.update)
servicesRoutes.delete('/remove/:id', servicesController.remove)

export default servicesRoutes;