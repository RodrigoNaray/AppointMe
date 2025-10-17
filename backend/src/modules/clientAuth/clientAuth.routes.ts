import { Router } from 'express';
import * as controller from './clientAuth.controller';
import { isClientAuthenticated } from '../../middlewares/isClientAuthenticated';

const clientAuthRoutes = Router();

clientAuthRoutes.post('/register', controller.registerClientController);
clientAuthRoutes.post('/login', controller.loginClientController);
clientAuthRoutes.post('/logout', controller.logoutClientController);

// Ruta para obtener el perfil del cliente autenticado
clientAuthRoutes.get('/profile', isClientAuthenticated, controller.getClientProfileController);

// Rutas para verificación de email
clientAuthRoutes.post('/verify-email', controller.verifyEmailController);
// OWASP: Ruta protegida - requiere autenticación para prevenir enumeración de usuarios
clientAuthRoutes.post('/resend-verification', isClientAuthenticated, controller.resendVerificationController);

// Rutas para cambio de email (requieren autenticación)
clientAuthRoutes.post('/request-email-change', isClientAuthenticated, controller.requestEmailChangeController);
clientAuthRoutes.post('/verify-email-change', controller.verifyEmailChangeController);

// Ruta para cambio de contraseña (requiere autenticación)
// OWASP A02:2021: Protegida con middleware isClientAuthenticated
clientAuthRoutes.post('/change-password', isClientAuthenticated, controller.changePasswordController);

export default clientAuthRoutes;