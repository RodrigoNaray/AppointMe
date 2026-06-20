import { Router } from "express";
import * as authController from './auth.controller';
import { isAdminAuthenticated } from "../../middlewares/isAdminAuthenticated";

const router: Router = Router();

router.post('/login', authController.loginController);
router.post('/logout', authController.logoutController);
router.get('/profile', isAdminAuthenticated ,authController.getProfileController)
router.post('/change-password', isAdminAuthenticated, authController.changePasswordController);

export default router;