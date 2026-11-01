import { Router } from 'express';
import { getBalance, topUpCredits, getLedger } from '../controllers/creditController';
import { requireAuth } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimit';

const router = Router();

router.use(apiRateLimit);
router.use(requireAuth);

router.get('/balance', getBalance);
router.post('/topup', topUpCredits);
router.get('/ledger', getLedger);

export default router;
