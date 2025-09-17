import { Router } from 'express';
import {
  createBookingController,
  getMyBookingsController,
  cancelBookingController,
  getAllBookingsController,
  getBookingByIdController
} from './booking.controller';
import { isClientAuthenticated } from '../../middlewares/isClientAuthenticated';
import { isAdminAuthenticated } from '../../middlewares/isAdminAuthenticated';

const router = Router();

// Rutas para clientes autenticados
router.post('/', isClientAuthenticated, createBookingController);
router.get('/my', isClientAuthenticated, getMyBookingsController);
router.get('/:id', isClientAuthenticated, getBookingByIdController);
router.patch('/:id/cancel', isClientAuthenticated, cancelBookingController);

// Rutas para administradores (prefijo /admin se maneja en server.ts)
export const adminBookingRoutes = Router();
adminBookingRoutes.get('/', isAdminAuthenticated, getAllBookingsController);

export default router;