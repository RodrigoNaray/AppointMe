import { Router } from 'express';
import * as controller from './client.admin.controller';

const clientsAdminRouter = Router();

clientsAdminRouter.get('/', controller.getClientsController);

export default clientsAdminRouter;
