import 'dotenv/config';

function optionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] ?? defaultValue;
}

function optionalFloat(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseFloat(raw);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const env = {
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  port: parseInt(optionalEnv('PORT', '3001'), 10),
  frontendOrigin: optionalEnv('FRONTEND_ORIGIN', 'http://localhost:5173'),
  appBaseUrl: optionalEnv('APP_BASE_URL', 'http://localhost:3001'),

  jwtSecret: optionalEnv('JWT_SECRET', 'dev-only-secret-CHANGE-IN-PRODUCTION'),
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '7d'),

  // AR generation provider
  arProvider: optionalEnv('AR_PROVIDER', 'unconfigured'),
  arProviderApiKey: optionalEnv('AR_PROVIDER_API_KEY', ''),
  cloudGpuEndpoint: optionalEnv('CLOUD_GPU_ENDPOINT', ''),
  cloudGpuApiKey: optionalEnv('CLOUD_GPU_API_KEY', ''),

  // TripoSR self-hosted server (AR_PROVIDER=triposr)
  // TripoSR is open-source and has no official hosted API — you must deploy your own server.
  // See backend/src/providers/ar/TripoSRARProvider.ts for deployment instructions.
  triposrEndpoint: optionalEnv('TRIPOSR_ENDPOINT', ''),
  triposrApiKey: optionalEnv('TRIPOSR_API_KEY', ''),

  // Subject segmentation provider
  segmentationProvider: optionalEnv('SEGMENTATION_PROVIDER', 'unconfigured'),
  segmentationApiKey: optionalEnv('SEGMENTATION_API_KEY', ''),
  segmentationConfidenceThreshold: optionalFloat('SEGMENTATION_CONFIDENCE_THRESHOLD', 0.70),

  // Storage
  storageProvider: optionalEnv('STORAGE_PROVIDER', 'local'),
  storageLocalPath: optionalEnv('STORAGE_LOCAL_PATH', './uploads'),
  storageS3Bucket: optionalEnv('STORAGE_S3_BUCKET', ''),
  storageS3Region: optionalEnv('STORAGE_S3_REGION', ''),
  storageS3AccessKeyId: optionalEnv('STORAGE_S3_ACCESS_KEY_ID', ''),
  storageS3SecretAccessKey: optionalEnv('STORAGE_S3_SECRET_ACCESS_KEY', ''),
  storageS3Endpoint: optionalEnv('STORAGE_S3_ENDPOINT', ''),

  // Stripe
  stripeSecretKey: optionalEnv('STRIPE_SECRET_KEY', ''),
  stripeWebhookSecret: optionalEnv('STRIPE_WEBHOOK_SECRET', ''),
  stripeWebAppPriceId: optionalEnv('STRIPE_WEB_APP_PRICE_ID', ''),
  stripeApiPlanPriceId: optionalEnv('STRIPE_API_PLAN_PRICE_ID', ''),

  // Master / Private API credential (internal only)
  masterInternalSecret: optionalEnv('MASTER_INTERNAL_SECRET', optionalEnv('INTERNAL_AR_SERVICE_SECRET', 'dev-master-secret-change-in-prod')),
  masterAllowedIps: optionalEnv('MASTER_ALLOWED_IPS', ''),

  // Private first-party internal service credential (fallback)
  internalArServiceSecret: optionalEnv('INTERNAL_AR_SERVICE_SECRET', 'dev-internal-secret-change-in-prod'),

  // Mock provider — ONLY for automated tests, never for production
  allowMockProvider: optionalEnv('ALLOW_MOCK_PROVIDER', 'false') === 'true',


  // Computed
  isDevelopment: optionalEnv('NODE_ENV', 'development') === 'development',
  isTest: optionalEnv('NODE_ENV', 'development') === 'test',
  isProduction: optionalEnv('NODE_ENV', 'development') === 'production',
};

