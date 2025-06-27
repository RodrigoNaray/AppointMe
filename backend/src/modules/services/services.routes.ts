import { Router } from "express";
import * as servicesController from "./services.controller";
import { isAuthenticated } from "../../middlewares/isAuthenticated";

const servicesRoutes: Router = Router();

//-- PUBLIC ROUTES
servicesRoutes.get('/' , servicesController.findAll)
servicesRoutes.get('/:id' ,servicesController.findOne)

//-- PRIVATE ROUTES
servicesRoutes.post('/' ,isAuthenticated , servicesController.create)
servicesRoutes.put('/update/:id' ,isAuthenticated ,servicesController.update)
servicesRoutes.delete('/remove/:id' ,isAuthenticated , servicesController.remove)

export default servicesRoutes;