import { Router } from 'express';
import * as availabilityController from './availability.admin.controller';
import { rateLimit } from '../../../middlewares/rateLimit';


const availabilityRouter = Router();

availabilityRouter.get('/schedule', availabilityController.getScheduleController);
availabilityRouter.put('/schedule', rateLimit('lax'), availabilityController.updateScheduleController);

availabilityRouter.get('/blocks', availabilityController.getBlocksController);
availabilityRouter.post('/blocks', rateLimit('lax'), availabilityController.createBlockController);
availabilityRouter.put('/blocks/:id', rateLimit('lax'), availabilityController.updateBlockController);
availabilityRouter.delete('/blocks/:id', rateLimit('lax'), availabilityController.deleteBlockController);

availabilityRouter.get('/calendar', availabilityController.getCalendarEventsController);

export default availabilityRouter;