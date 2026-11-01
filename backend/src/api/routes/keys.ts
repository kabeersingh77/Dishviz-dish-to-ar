import { Router } from 'express';
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  renameApiKey,
} from '../controllers/apiKeyController';
import { requireAuth } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimit';

const router = Router();

// All key management routes require a browser session (not an API key itself)
router.use(requireAuth);
router.use(apiRateLimit);

router.get('/', listApiKeys);
router.post('/', createApiKey);
router.delete('/:keyId', revokeApiKey);
router.patch('/:keyId', renameApiKey);

export default router;
