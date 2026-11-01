import { Router } from 'express';
import { recordConsent } from '../controllers/complianceController';
import { optionalAuth } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimit';

const router = Router();

router.post('/consent', apiRateLimit, optionalAuth, recordConsent);

export default router;
