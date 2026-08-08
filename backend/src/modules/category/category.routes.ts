import { Router } from 'express';
import * as controller from './category.controller';
import { isAdminAuthenticated } from '../../middlewares/isAdminAuthenticated';
import { rateLimit } from '../../middlewares/rateLimit';

const router = Router();

/**
 * IMPORTANTE: Rutas más específicas PRIMERO
 * Express procesa rutas en orden de registro
 * 
 * Rutas protegidas (requieren autenticación de admin)
 * OWASP A01:2021 - Broken Access Control: Solo admin puede CRUD categorías
 */
router.get('/admin', isAdminAuthenticated, controller.findAll);
router.get('/admin/:id', isAdminAuthenticated, controller.findOne);
router.post('/admin', isAdminAuthenticated, rateLimit('lax'), controller.create);
router.put('/admin/:id', isAdminAuthenticated, rateLimit('lax'), controller.update);
router.delete('/admin/:id', isAdminAuthenticated, rateLimit('lax'), controller.remove);

/**
 * Rutas públicas (sin autenticación)
 * GET /api/categories - Lista categorías públicas activas
 * DEBE ir después de las rutas /admin para no capturarlas
 */
router.get('/', controller.findAllPublic);

export default router;
