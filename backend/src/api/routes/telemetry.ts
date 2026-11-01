import { Router } from 'express';
import { recordTelemetry } from '../controllers/telemetryController';
import { apiRateLimit } from '../middleware/rateLimit';

const router = Router();

router.post('/events', apiRateLimit, recordTelemetry);

export default router;
