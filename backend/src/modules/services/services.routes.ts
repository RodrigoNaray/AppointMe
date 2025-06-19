import { Router } from "express";
import servicesController from "./services.controller";

const servicesRoutes: Router = Router();

servicesRoutes.post('/', servicesController.createElement)

export default servicesRoutes;