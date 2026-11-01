import { Router } from 'express';
import { register, login, logout, me, deleteAccount } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';

const router = Router();

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.delete('/me', requireAuth, deleteAccount);

export default router;

