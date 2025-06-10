import { Router } from "express";
import catalogController from "./catalog.controller";

const catalogRoutes: Router = Router();

catalogRoutes.post('/', catalogController.createElement)

export default catalogRoutes