import { Router } from "express";
import * as servicesController from "./services.controller";
import { isAdminAuthenticated } from "../../middlewares/isAdminAuthenticated";

const servicesRoutes: Router = Router();

//-- PUBLIC ROUTES
servicesRoutes.get('/' , servicesController.findAll)
// NOTA: GET /:id eliminado - no se usa en frontend (dead code removal)

//-- PRIVATE ROUTES
servicesRoutes.post('/' ,isAdminAuthenticated , servicesController.create)
servicesRoutes.put('/update/:id' ,isAdminAuthenticated ,servicesController.update)
servicesRoutes.delete('/remove/:id' ,isAdminAuthenticated , servicesController.remove)

export default servicesRoutes;