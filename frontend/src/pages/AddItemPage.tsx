import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Camera,
  Upload,
  Check,
  AlertCircle,
  X,
  CreditCard,
  Layers,
  Sparkles,
  Info,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { jobs, credits, type CreditBalanceResponse } from '../api/client';
import { BUSINESS } from '../config/business';
import { validateImageBatch } from '../utils/imageValidation';

interface AngleGuide {
  id: number;
  label: string;
  sublabel: string;
  tip: string;
}

const GUIDED_ANGLES: AngleGuide[] = [
  { id: 1, label: 'Hero 45° Angle', sublabel: 'Main presentation view', tip: 'Shoot diagonally at a 45-degree angle from plate center' },
  { id: 2, label: 'Eye-Level Front', sublabel: 'Straight-on horizon', tip: 'Align camera level with the dish rim' },
  { id: 3, label: 'Right 45° Profile', sublabel: 'Lateral volume & side relief', tip: 'Step 45 degrees to the right, keep plate centered' },
  { id: 4, label: 'Rear 45° Elevation', sublabel: 'Back presentation & height', tip: 'Photograph the rear rim and depth structure' },
  { id: 5, label: 'Left 45° Profile', sublabel: 'Opposite lateral volume', tip: 'Step 45 degrees to the left, capturing opposite side' },
  { id: 6, label: 'Bird\'s-Eye Top Down', sublabel: '90° vertical geometry', tip: 'Hold camera straight above the dish looking down' },
  { id: 7, label: 'Texture / Macro Detail', sublabel: 'Sauce, glaze & garnish', tip: 'Crisp close-up focus on surface textures' },
  { id: 8, label: 'Ambient Context Angle', sublabel: 'Full dish perimeter', tip: 'Final pass capturing plate rim and full perimeter' },
];

const CATEGORIES = [
  { id: 'veg', label: 'Vegetarian', color: 'border-emerald-600 text-emerald-700 bg-emerald-50' },
  { id: 'non-veg', label: 'Non-Vegetarian', color: 'border-red-600 text-red-700 bg-red-50' },
  { id: 'vegan', label: 'Vegan', color: 'border-green-700 text-green-800 bg-green-50' },
  { id: 'dessert', label: 'Dessert', color: 'border-amber-600 text-amber-700 bg-amber-50' },
  { id: 'beverage', label: 'Beverage', color: 'border-blue-600 text-blue-700 bg-blue-50' },
];

export function AddItemPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('veg');
  const [itemPrice, setItemPrice] = useState('');
  const [itemTasteProfile, setItemTasteProfile] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [segmentationMode, setSegmentationMode] = useState<'smart' | 'dish_only'>('smart');
  const [webhookUrl, setWebhookUrl] = useState('');

  // Photos & files
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Credits & submission
  const [creditInfo, setCreditInfo] = useState<CreditBalanceResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);

  // Load user credit balance
  useEffect(() => {
    credits.getBalance()
      .then(setCreditInfo)
      .catch((err) => console.warn('Could not load credit balance:', err));
  }, []);

  const handleFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).slice(0, 16);
    const combined = [...selectedFiles, ...fileArray].slice(0, 16);
    setSelectedFiles(combined);

    // Create preview URLs
    const urls = combined.map((f) => URL.createObjectURL(f));
    setFilePreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return urls;
    });

    // Validate images
    const valResult = await validateImageBatch(combined);
    setValidationErrors(valResult.errors);
    setValidationWarnings(valResult.globalWarnings);
  };

  const handleRemovePhoto = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    setFilePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleQuickTopUp = async (tierId: string) => {
    try {
      setTopupLoading(true);
      const res = await credits.topUp({ tier: tierId });
      setCreditInfo((prev) => prev ? {
        ...prev,
        balance: res.newBalance,
        generationsRemaining: res.generationsRemaining,
      } : null);
    } catch (err: any) {
      alert(err?.message || 'Top-up failed. Please check network.');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length < 6) {
      setValidationErrors(['Minimum 6 photos required for volumetric multi-angle 3D reconstruction.']);
      return;
    }
    if (!itemName.trim()) {
      setValidationErrors(['Please enter a dish or item name.']);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const parsedPrice = itemPrice ? parseFloat(itemPrice) : undefined;
      const idempotencyKey = `bma_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const response = await jobs.create(selectedFiles, {
        segmentationMode,
        consentGiven: true,
        itemName: itemName.trim(),
        itemDescription: itemDescription.trim() || undefined,
        itemTasteProfile: itemTasteProfile.trim() || undefined,
        itemCategory,
        itemPrice: isNaN(parsedPrice as number) ? undefined : parsedPrice,
        idempotencyKey,
        webhookUrl: webhookUrl.trim() || undefined,
      });

      navigate(`/result/${response.jobId}`);
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err?.message || 'Failed to submit 3D reconstruction job. Please try again.');
    }
  };

  const balance = creditInfo?.balance ?? 0;
  const cost = creditInfo?.costPerGeneration ?? BUSINESS.credits.costPerGeneration;
  const hasSufficientCredits = balance >= cost;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ─── Header ─── */}
        <div className="border-b border-neutral-200 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold tracking-wider uppercase text-neutral-500">
                Dishviz Food Pipeline
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span className="text-xs text-neutral-500 font-mono">Engine: Native 3D Core</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Add Food Dish for AR Reconstruction
            </h1>
            <p className="text-sm text-neutral-600 mt-1">
              Capture or upload 6 to 8 multi-angle photos of the prepared dish. Our native engine generates AR-ready GLB and USDZ models with zero external cloud dependencies.
            </p>
          </div>

          {/* Credit balance badge */}
          <div className="bg-white border border-neutral-200 rounded-md p-3.5 flex items-center gap-4 shadow-sm min-w-56">
            <div className="w-10 h-10 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-neutral-500 uppercase tracking-wider font-mono">Credit Balance</div>
              <div className="text-lg font-bold font-mono text-neutral-900">
                ${balance.toFixed(2)}
              </div>
              <div className="text-xs text-neutral-500">
                Cost: ${cost.toFixed(2)} / generation
              </div>
            </div>
          </div>
        </div>

        {/* Low balance alert if applicable */}
        {!hasSufficientCredits && creditInfo && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900">Account balance below $1.50</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Your current balance is ${balance.toFixed(2)}. Select an infrastructure credit tier to initiate multi-angle generation.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {creditInfo.tiers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleQuickTopUp(t.id)}
                  disabled={topupLoading}
                  className="px-3 py-1.5 text-xs font-mono font-medium rounded border border-amber-300 bg-white text-neutral-900 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ─── Step 1: Dish Metadata ─── */}
          <div className="bg-white border border-neutral-200 rounded-md p-6 shadow-sm space-y-6">
            <div className="border-b border-neutral-100 pb-4">
              <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-neutral-900 text-white text-xs font-mono flex items-center justify-center">1</span>
                Dish & Menu Metadata
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Enter culinary specifications. These properties will be bound to the 3D AR artifact and embed card.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dish Name */}
              <div className="space-y-1.5">
                <label htmlFor="itemName" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Dish / Item Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="itemName"
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Truffle Pappardelle al Burro"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
                />
              </div>

              {/* Price */}
              <div className="space-y-1.5">
                <label htmlFor="itemPrice" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Menu Price (USD)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500 text-sm">$</span>
                  <input
                    id="itemPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="24.00"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
                  />
                </div>
              </div>

              {/* Dietary Category */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Dietary Classification <span className="text-red-600">*</span>
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setItemCategory(cat.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                        itemCategory === cat.id
                          ? `${cat.color} font-semibold ring-1 ring-neutral-900`
                          : 'border-neutral-200 text-neutral-600 bg-white hover:bg-neutral-50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Taste Profile */}
              <div className="space-y-1.5 md:col-span-2">
                <label htmlFor="itemTasteProfile" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Taste Profile / Sensory Attributes
                </label>
                <input
                  id="itemTasteProfile"
                  type="text"
                  value={itemTasteProfile}
                  onChange={(e) => setItemTasteProfile(e.target.value)}
                  placeholder="e.g. Rich brown butter, earthy black winter truffle, nutty 24-month Parmigiano-Reggiano finish"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5 md:col-span-2">
                <label htmlFor="itemDescription" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Detailed Culinary Description / Ingredients
                </label>
                <textarea
                  id="itemDescription"
                  rows={2}
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Handmade egg pasta tossed with cultured butter, cracked tellicherry pepper, and shaved black truffle tableside."
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
                />
              </div>

              {/* Segmentation Mode */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Background Segmentation Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSegmentationMode('smart')}
                    className={`p-3 text-left border rounded-md transition-colors ${
                      segmentationMode === 'smart'
                        ? 'border-neutral-900 bg-neutral-50 text-neutral-900'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="text-xs font-semibold">Smart Isolation</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Retains plate rim and garnishes</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSegmentationMode('dish_only')}
                    className={`p-3 text-left border rounded-md transition-colors ${
                      segmentationMode === 'dish_only'
                        ? 'border-neutral-900 bg-neutral-50 text-neutral-900'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="text-xs font-semibold">Strict Subject Only</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Cuts away tabletop and utensils</div>
                  </button>
                </div>
              </div>

              {/* Webhook URL */}
              <div className="space-y-1.5">
                <label htmlFor="webhookUrl" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Completion Webhook URL (Optional)
                </label>
                <input
                  id="webhookUrl"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-api.com/webhooks/dishviz"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
                />
              </div>
            </div>
          </div>

          {/* ─── Step 2: 6-8 Guided Angle Capture ─── */}
          <div className="bg-white border border-neutral-200 rounded-md p-6 shadow-sm space-y-6">
            <div className="border-b border-neutral-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-neutral-900 text-white text-xs font-mono flex items-center justify-center">2</span>
                  Multi-Angle Photo Capture (6 to 8 Angles)
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Reconstruction requires multiple overlapping viewpoints around the plate to form a watertight 3D mesh.
                </p>
              </div>
              <div className="text-xs font-mono font-medium px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded text-neutral-800 self-start sm:self-auto">
                {selectedFiles.length} / 8 Photos Staged
              </div>
            </div>

            {/* Angle Checklist Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {GUIDED_ANGLES.map((guide, idx) => {
                const isCaptured = idx < selectedFiles.length;
                return (
                  <div
                    key={guide.id}
                    className={`border rounded-md p-3 transition-colors ${
                      isCaptured
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-mono font-semibold text-neutral-500">Angle 0{guide.id}</span>
                      {isCaptured ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                          <Check className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400">Required</span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-neutral-900">{guide.label}</div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">{guide.sublabel}</div>
                    <div className="text-[10px] text-neutral-500 italic mt-1">{guide.tip}</div>
                  </div>
                );
              })}
            </div>

            {/* Upload Drag-and-Drop Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 hover:border-neutral-600 bg-neutral-50 hover:bg-neutral-100/60 rounded-md p-8 text-center cursor-pointer transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFilesChosen(e.target.files)}
              />
              <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
              <div className="text-sm font-semibold text-neutral-800">
                Click to select or drag 6 to 8 photos here
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Accepted: JPG, PNG, WebP up to 15MB each. Resolution 800x800px minimum.
              </div>
            </div>

            {/* Photo Previews Strip */}
            {filePreviews.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Selected Viewpoints ({filePreviews.length})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                  {filePreviews.map((url, i) => (
                    <div key={i} className="relative group rounded border border-neutral-200 overflow-hidden aspect-square bg-neutral-100">
                      <img src={url} alt={`Angle ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 bg-neutral-900/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                        #{i + 1}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(i);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation feedback */}
            {validationErrors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md space-y-1">
                {validationErrors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {err}
                  </p>
                ))}
              </div>
            )}
            {validationWarnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md space-y-1">
                {validationWarnings.map((warn, i) => (
                  <p key={i} className="text-xs text-amber-800 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    {warn}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* ─── Step 3: Billing & Submission ─── */}
          <div className="bg-white border border-neutral-200 rounded-md p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                <span>Infrastructure Guarantee</span>
                <span className="text-[11px] font-mono text-neutral-500">· $1.50 flat fee</span>
              </div>
              <p className="text-xs text-neutral-500 max-w-xl">
                100% automatic refund guarantee: if our native 3D reconstruction engine cannot isolate the dish or fails to produce a clean GLB/USDZ asset, the \$1.50 credit is instantly refunded to your ledger.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="px-4 py-2 text-sm font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || selectedFiles.length < 6 || !hasSufficientCredits}
                className="px-5 py-2 text-sm font-semibold rounded-md bg-neutral-900 hover:bg-neutral-800 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing Multi-Angle 3D...
                  </>
                ) : (
                  <>
                    Generate 3D AR Model
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {submitError}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
