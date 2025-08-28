import { Router } from "express";
import * as healthController from "./health.controller"


const healthRoutes: Router = Router();

healthRoutes.get('/', healthController.checkHealth);

export default healthRoutes;

