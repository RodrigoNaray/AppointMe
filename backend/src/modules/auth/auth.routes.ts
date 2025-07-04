import { Router } from "express";
import * as authController from './auth.controller';
import { isAuthenticated } from "../../middlewares/isAuthenticated";

const router: Router = Router();

router.post('/login', authController.loginController);
router.post('/logout', authController.logoutController);
router.get('/profile', isAuthenticated ,authController.getProfileController)

export default router;