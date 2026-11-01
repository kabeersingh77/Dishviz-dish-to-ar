import { Router } from 'express';
import authRoutes from './auth';
import arRoutes from './ar';
import keyRoutes from './keys';
import billingRoutes from './billing';
import creditsRoutes from './credits';
import complianceRoutes from './compliance';
import telemetryRoutes from './telemetry';

const router = Router();

router.use('/auth', authRoutes);
router.use('/ar', arRoutes);
router.use('/keys', keyRoutes);
router.use('/billing', billingRoutes);
router.use('/credits', creditsRoutes);
router.use('/compliance', complianceRoutes);
router.use('/telemetry', telemetryRoutes);

export default router;



