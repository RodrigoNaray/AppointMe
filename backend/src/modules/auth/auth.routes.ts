import { Router } from "express";
import * as authController from './auth.controller';

const router: Router = Router();

router.post('/login', authController.loginController);
router.post('/logout', authController.logoutController);

export default router;