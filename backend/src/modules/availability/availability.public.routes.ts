import { Router } from 'express';
import * as controller from './availability.public.controllers';

const router = Router();

// Esta ruta es pública para que los clientes puedan ver la disponibilidad.
// Se montará en /api/availability en server.ts
router.get('/', controller.getAvailableSlotsController);

export default router;