import { Router } from 'express';
import * as controller from './availability.public.controllers';

const router = Router();

// Esta ruta es pública para que los clientes puedan ver la disponibilidad.
// Se montará en /api/availability en server.ts

// GET /api/availability/month?month=YYYY-MM&totalDuration=X
router.get('/month', controller.getMonthAvailabilityController);

// GET /api/availability?serviceId=X&date=YYYY-MM-DD
router.get('/', controller.getAvailableSlotsController);

export default router;