import { Router } from "express";
import * as authController from './auth.controller';
import { isAdminAuthenticated } from "../../middlewares/isAdminAuthenticated";
import { rateLimit } from '../../middlewares/rateLimit';

const router: Router = Router();

router.post('/login', rateLimit('strict'), authController.loginController);
router.post('/logout', authController.logoutController);
router.get('/profile', isAdminAuthenticated ,authController.getProfileController)
router.put('/profile', isAdminAuthenticated, authController.updateProfileController);
router.post('/change-password', isAdminAuthenticated, authController.changePasswordController);

export default router;