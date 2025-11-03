import { Router } from 'express';
import * as bookingController from './booking.controller'
import { isClientAuthenticated } from '../../middlewares/isClientAuthenticated';
import { isAdminAuthenticated } from '../../middlewares/isAdminAuthenticated';

const router = Router();

// Rutas para clientes autenticados
router.post('/create', isClientAuthenticated, bookingController.createBooking);
router.get('/my', isClientAuthenticated, bookingController.getMyBookings);
router.get('/:id', isClientAuthenticated, bookingController.getBookingById);
router.put('/:id/cancel', isClientAuthenticated, bookingController.cancelBooking); // PUT para mejor compatibilidad CORS

// Rutas para administradores (prefijo /admin se maneja en server.ts)
export const adminBookingRoutes = Router();
adminBookingRoutes.get('/', isAdminAuthenticated, bookingController.getAllBookings);

export default router;