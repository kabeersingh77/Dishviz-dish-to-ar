/**
 * Centralized frontend business configuration.
 * Values here must match the backend config/business.ts.
 * No secrets — this file is bundled into the browser.
 */
export const BUSINESS = {
  name: 'Dishviz',
  legalEntity: 'Dishviz Technologies',
  supportEmail: 'support@dishviz.com',
  privacyEmail: 'privacy@dishviz.com',

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
      name: 'AR Creator',
      displayPrice: '$20/month',
      trialGenerations: 5,
    },
    developerApi: {
      name: 'Developer API',
      displayPrice: '$15/month',
    },
  },

  limits: {
    trialGenerations: 5,
    maxImagesPerJob: 12,
    minImagesRecommended: 6,
    maxFileSizeMB: 15,
    minImageWidth: 640,
    minImageHeight: 480,
  },

  retention: {
    rawPhotosDays: 30,
    generatedAssetsDays: 90,
    deletionRequestProcessingDays: 30,
  },

  segmentation: {
    defaultMode: 'smart' as SegmentationMode,
  },

  policies: {
    version: '1.0.0',
    effectiveDate: '2024-01-01',
  },

  thirdPartyProcessors: [
    'Stripe (payment processing)',
    'AR reconstruction provider — see operator configuration',
    'Subject segmentation provider — see operator configuration',
    'Object storage provider — see operator configuration',
  ],
} as const;

export type SegmentationMode = 'smart' | 'dish_only' | 'custom';

