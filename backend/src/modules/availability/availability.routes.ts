import { Router } from 'express';
import * as availabilityController from './availability.controller';


const availabilityRouter = Router();

availabilityRouter.get('/schedule', availabilityController.getScheduleController);
availabilityRouter.put('/schedule', availabilityController.updateScheduleController);

availabilityRouter.get('/blocks', availabilityController.getBlocksController);
availabilityRouter.post('/blocks', availabilityController.createBlockController);
availabilityRouter.delete('/blocks/:id',availabilityController.deleteBlockController);

export default availabilityRouter;