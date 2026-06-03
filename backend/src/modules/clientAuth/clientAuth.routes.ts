import { Router } from 'express';
import passport from 'passport';
import * as controller from './clientAuth.controller';
import { isClientAuthenticated } from '../../middlewares/isClientAuthenticated';
import { rateLimit } from '../../middlewares/rateLimit';

const clientAuthRoutes = Router();

clientAuthRoutes.post('/register', rateLimit('strict'), controller.registerClientController);
clientAuthRoutes.post('/login', rateLimit('strict'), controller.loginClientController);
clientAuthRoutes.post('/logout', controller.logoutClientController);

// Ruta para obtener el perfil del cliente autenticado
clientAuthRoutes.get('/profile', isClientAuthenticated, controller.getClientProfileController);

// Ruta para actualizar el perfil del cliente autenticado (ej. phone)
// OWASP A02:2021: Protegida con middleware isClientAuthenticated
clientAuthRoutes.patch('/profile', isClientAuthenticated, controller.updateClientProfileController);

// Rutas para verificación de email
clientAuthRoutes.post('/verify-email', rateLimit('normal'), controller.verifyEmailController);
// OWASP: Ruta protegida - requiere autenticación para prevenir enumeración de usuarios
clientAuthRoutes.post('/resend-verification', isClientAuthenticated, controller.resendVerificationController);

// Rutas para cambio de email (requieren autenticación)
clientAuthRoutes.post('/request-email-change', isClientAuthenticated, controller.requestEmailChangeController);
clientAuthRoutes.post('/verify-email-change', rateLimit('normal'), controller.verifyEmailChangeController);

// Ruta para cambio de contraseña (requiere autenticación)
// OWASP A02:2021: Protegida con middleware isClientAuthenticated
clientAuthRoutes.post('/change-password', isClientAuthenticated, controller.changePasswordController);

// Rutas de recuperación de contraseña (públicas - no requieren autenticación)
// OWASP A01:2021: forgotPassword retorna siempre 200 para prevenir enumeración de usuarios
clientAuthRoutes.post('/forgot-password', rateLimit('strict'), controller.forgotPasswordController);
clientAuthRoutes.post('/reset-password', rateLimit('strict'), controller.resetPasswordController);

// Rutas de Google OAuth 2.0
// OWASP A02:2021: CSRF protection mediante state parameter (manejado por passport)
// Nota: returnUrl se maneja en frontend con sessionStorage (Zustand oauthStore)
clientAuthRoutes.get(
  '/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false,
  })
);

clientAuthRoutes.get(
  '/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed`,
  }),
  controller.googleCallbackController
);

export default clientAuthRoutes;