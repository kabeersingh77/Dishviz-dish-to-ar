/**
 * Typed API client.
 * All backend communication goes through this module.
 * No direct fetch() calls in components or hooks.
 *
 * Uses relative /api paths in development (Vite proxy) and
 * VITE_API_BASE_URL in production.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bma_auth_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include', // Always send httpOnly cookie
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    let errorCode: string | undefined;
    try {
      const body = await res.json() as { error?: string; code?: string };
      if (body.error) errorMessage = body.error;
      errorCode = body.code;
    } catch {
      // Use default message if response is not JSON
    }
    throw new ApiError(res.status, errorMessage, errorCode);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

async function requestFormData<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
    // Do NOT set Content-Type — browser sets it with boundary for multipart
  });

  if (!res.ok) {
    let errorMessage = `Upload failed (${res.status})`;
    let errorCode: string | undefined;
    try {
      const body = await res.json() as { error?: string; code?: string };
      if (body.error) errorMessage = body.error;
      errorCode = body.code;
    } catch {
      // Use default message
    }
    throw new ApiError(res.status, errorMessage, errorCode);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────

import type { MeResponse } from '../types/api';

export const auth = {
  register: async (data: { email: string; password: string; name?: string }) => {
    const res = await request<MeResponse & { token?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      localStorage.setItem('bma_auth_token', res.token);
    }
    return res;
  },

  login: async (data: { email: string; password: string }) => {
    const res = await request<{ user: MeResponse['user']; token?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      localStorage.setItem('bma_auth_token', res.token);
    }
    return res;
  },

  logout: async () => {
    try {
      await request<{ message: string }>('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('bma_auth_token');
    }
  },

  me: () => request<MeResponse>('/auth/me'),
};

// ─── AR Jobs ───────────────────────────────────────────────────────────────

import type { ARJob, ARJobResult, SegmentationMode } from '../types/api';

export const jobs = {
  create: (
    images: File[] | Blob[],
    options: {
      segmentationMode?: SegmentationMode;
      consentGiven: boolean;
      itemName?: string;
      itemDescription?: string;
      itemTasteProfile?: string;
      itemCategory?: string;
      itemPrice?: number;
      idempotencyKey?: string;
      webhookUrl?: string;
    }
  ) => {
    const formData = new FormData();
    images.forEach((img, i) => formData.append('images', img, `image_${i}.jpg`));
    formData.append('segmentationMode', options.segmentationMode ?? 'smart');
    formData.append('consentGiven', String(options.consentGiven));
    if (options.itemName) formData.append('itemName', options.itemName);
    if (options.itemDescription) formData.append('itemDescription', options.itemDescription);
    if (options.itemTasteProfile) formData.append('itemTasteProfile', options.itemTasteProfile);
    if (options.itemCategory) formData.append('itemCategory', options.itemCategory);
    if (options.itemPrice !== undefined && options.itemPrice !== null) {
      formData.append('itemPrice', String(options.itemPrice));
    }
    if (options.idempotencyKey) formData.append('idempotencyKey', options.idempotencyKey);
    if (options.webhookUrl) formData.append('webhookUrl', options.webhookUrl);
    return requestFormData<{ jobId: string; status: string }>('/ar/jobs', formData);
  },

  getStatus: (jobId: string) =>
    request<ARJob>(`/ar/jobs/${jobId}`),

  getResult: (jobId: string) =>
    request<ARJobResult>(`/ar/jobs/${jobId}/result`),

  confirmSegmentation: (jobId: string, includedObjects: string[]) =>
    request<{ jobId: string }>(`/ar/jobs/${jobId}/confirm-segmentation`, {
      method: 'POST',
      body: JSON.stringify({ includedObjects }),
    }),

  delete: (jobId: string) =>
    request<void>(`/ar/jobs/${jobId}`, { method: 'DELETE' }),

  list: () =>
    request<{ jobs: ARJob[] }>('/ar/jobs'),
};

// ─── API Keys ──────────────────────────────────────────────────────────────

import type { ApiKey, ApiKeyCreated } from '../types/api';

export const apiKeys = {
  list: () => request<{ keys: ApiKey[] }>('/keys'),

  create: (name: string) =>
    request<ApiKeyCreated>('/keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  rename: (keyId: string, name: string) =>
    request<ApiKey>(`/keys/${keyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  revoke: (keyId: string) =>
    request<void>(`/keys/${keyId}`, { method: 'DELETE' }),
};

// ─── Billing ───────────────────────────────────────────────────────────────

import type { SubscriptionInfo } from '../types/api';

export const billing = {
  createCheckout: (plan: 'web_app' | 'developer_api') =>
    request<{ checkoutUrl: string }>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),

  createPortal: () =>
    request<{ portalUrl: string }>('/billing/portal', {
      method: 'POST',
    }),

  getSubscription: () =>
    request<{ subscription: SubscriptionInfo | null }>('/billing/subscription'),
};

// ─── Compliance ────────────────────────────────────────────────────────────

export const compliance = {
  recordConsent: (data: {
    consentType: string;
    granted: boolean;
    preferences?: Record<string, boolean>;
  }) =>
    request<{ success: boolean; recorded: boolean }>('/compliance/consent', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Telemetry ─────────────────────────────────────────────────────────────

export const telemetryApi = {
  sendEvent: (event: string, properties?: Record<string, unknown>) =>
    request<void>('/telemetry/events', {
      method: 'POST',
      body: JSON.stringify({ event, properties }),
    }),
};

// ─── Assets (Persistent 3D Models) ─────────────────────────────────────────

export interface AssetDetails {
  assetId: string;
  jobId: string | null;
  type: string;
  visibility: 'private' | 'unlisted' | 'public';
  version: number;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string | null;
  glbUrl: string | null;
  usdzUrl: string | null;
  thumbnailUrl: string | null;
  isOwner: boolean;
  createdAt: string;
}

export const assets = {
  get: (assetId: string) => request<AssetDetails>(`/ar/assets/${assetId}`),
  updateVisibility: (jobId: string, visibility: 'private' | 'unlisted' | 'public') =>
    request<{ jobId: string; visibility: string }>(`/ar/jobs/${jobId}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility }),
    }),
};

// ─── Credits & Balance ─────────────────────────────────────────────────────

export interface CreditBalanceResponse {
  balance: number;
  costPerGeneration: number;
  generationsRemaining: number;
  tiers: Array<{
    id: string;
    name: string;
    credits: number;
    priceUsd: number;
    generations: number;
    popular?: boolean;
  }>;
  minTopup: number;
}

export const credits = {
  getBalance: () => request<CreditBalanceResponse>('/credits/balance'),
  topUp: (data: { amount?: number; tier?: string }) =>
    request<{
      success: boolean;
      amountAdded: number;
      newBalance: number;
      costPerGeneration: number;
      generationsRemaining: number;
    }>('/credits/topup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getLedger: (limit?: number) =>
    request<{
      history: Array<{
        id: string;
        amount: number;
        type: string;
        jobId: string | null;
        description: string | null;
        balanceAfter: number;
        createdAt: string;
      }>;
    }>(`/credits/ledger${limit ? `?limit=${limit}` : ''}`),
};


