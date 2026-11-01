/**
 * Centralized business configuration.
 *
 * Change values here — do NOT scatter them across the codebase.
 *
 * LEGAL NOTE: Placeholders marked [PLACEHOLDER] require review by
 * qualified legal counsel before production launch.
 */
export const BUSINESS = {
  name: 'Dishviz',
  legalEntity: 'Dishviz Technologies',
  supportEmail: 'support@dishviz.com',
  privacyEmail: 'privacy@dishviz.com',
  websiteUrl: 'https://dishviz.com',
  currency: 'usd',

  credits: {
    costPerGeneration: 1.50, // $1.50 per successful 3D generation
    minTopup: 100,
    minCustomTopUp: 100,
    packs: [
      { id: 'tier_100', name: '$100 Pack', credits: 100, priceUsd: 100, amount: 100, label: '$100 Pack', generations: 66, popular: false },
      { id: 'tier_250', name: '$250 Pack', credits: 250, priceUsd: 250, amount: 250, label: '$250 Pack', generations: 166, popular: true },
      { id: 'tier_500', name: '$500 Pack', credits: 500, priceUsd: 500, amount: 500, label: '$500 Pack', generations: 333, popular: false },
    ],
    topUpTiers: [
      { id: 'tier_100', name: '$100 Pack', credits: 100, priceUsd: 100, amount: 100, label: '$100 Pack', generations: 66, popular: false },
      { id: 'tier_250', name: '$250 Pack', credits: 250, priceUsd: 250, amount: 250, label: '$250 Pack', generations: 166, popular: true },
      { id: 'tier_500', name: '$500 Pack', credits: 500, priceUsd: 500, amount: 500, label: '$500 Pack', generations: 333, popular: false },
    ],
    expiryPolicy: 'Credits never expire',
  },

  plans: {
    webApp: {
      id: 'web_app',
      name: 'AR Creator',
      priceMonthly: 2000, // cents ($20.00)
      displayPrice: '$20/month',
      trialGenerations: 5,
    },
    developerApi: {
      id: 'developer_api',
      name: 'Developer API',
      priceMonthly: 1500, // cents ($15.00)
      displayPrice: '$15/month',
      /** null = unlimited; set a number to enforce a monthly job cap */
      monthlyJobLimit: null as null | number,
    },
  },

  limits: {
    trialGenerations: 5,
    maxImagesPerJob: 12,
    minImagesRecommended: 6,
    maxFileSizeBytes: 15 * 1024 * 1024, // 15 MB per image
    minImageWidth: 640,
    minImageHeight: 480,
    maxApiKeysPerUser: 10,
    maxJobsPerHour: 10,
  },

  retention: {
    rawPhotosDays: 30,
    generatedAssetsDays: 90,
    deletionRequestProcessingDays: 30,
  },

  segmentation: {
    defaultMode: 'smart' as const,
    confidenceThreshold: 0.70,
    minForegroundCoverage: 0.15, // 15% of frame must be foreground
  },

  policies: {
    version: '1.0.0',
    effectiveDate: '2024-01-01',
  },

  /**
   * Third-party processors that may receive user data.
   * Must be kept up to date and reflected in the Privacy Policy.
   */
  thirdPartyProcessors: [
    'Stripe (payment processing)',
    'AR reconstruction provider — see AR_PROVIDER environment variable',
    'Subject segmentation provider — see SEGMENTATION_PROVIDER environment variable',
    'Object storage provider — see STORAGE_PROVIDER environment variable',
  ],
} as const;

export type PlanId = 'web_app' | 'developer_api';
export type SegmentationMode = 'smart' | 'dish_only' | 'custom';
