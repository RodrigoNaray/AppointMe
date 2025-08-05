import { Router } from 'express';
import * as controller from './availability.controller';

const router = Router();

router.get('/schedule', controller.getScheduleController);
router.put('/schedule', controller.updateScheduleController);

export default router;