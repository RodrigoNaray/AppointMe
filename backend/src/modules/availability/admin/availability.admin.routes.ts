import { Router } from 'express';
import * as availabilityController from './availability.admin.controller';


const availabilityRouter = Router();

availabilityRouter.get('/schedule', availabilityController.getScheduleController);
availabilityRouter.put('/schedule', availabilityController.updateScheduleController);

availabilityRouter.get('/blocks', availabilityController.getBlocksController);
availabilityRouter.post('/blocks', availabilityController.createBlockController);
availabilityRouter.put('/blocks/:id', availabilityController.updateBlockController);
availabilityRouter.delete('/blocks/:id',availabilityController.deleteBlockController);

availabilityRouter.get('/calendar', availabilityController.getCalendarEventsController);

export default availabilityRouter;