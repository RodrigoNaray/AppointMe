import { Router } from 'express';
import * as controller from './clientAuth.controller';

const clientAuthRoutes = Router();

clientAuthRoutes.post('/register', controller.registerClientController);
clientAuthRoutes.post('/login', controller.loginClientController);
clientAuthRoutes.post('/logout', controller.logoutClientController);

export default clientAuthRoutes;