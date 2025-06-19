import { Router } from "express";
import * as servicesController from "./services.controller";

const servicesRoutes: Router = Router();

servicesRoutes.post('/', servicesController.create)

export default servicesRoutes;