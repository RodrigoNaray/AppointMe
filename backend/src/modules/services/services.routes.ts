import { Router } from "express";
import * as servicesController from "./services.controller";
import { isAdminAuthenticated } from "../../middlewares/isAdminAuthenticated";
import { rateLimit } from "../../middlewares/rateLimit";

const servicesRoutes: Router = Router();

//-- PUBLIC ROUTES
servicesRoutes.get('/' , servicesController.findAll)
// NOTA: GET /:id eliminado - no se usa en frontend (dead code removal)

//-- PRIVATE ROUTES
servicesRoutes.post('/' ,isAdminAuthenticated, rateLimit('lax') , servicesController.create)
servicesRoutes.put('/update/:id' ,isAdminAuthenticated, rateLimit('lax') ,servicesController.update)
servicesRoutes.delete('/remove/:id' ,isAdminAuthenticated, rateLimit('lax') , servicesController.remove)

export default servicesRoutes;