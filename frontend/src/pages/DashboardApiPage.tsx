import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Copy, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { apiKeys, ApiError } from '../api/client';
import type { ApiKey, ApiKeyCreated } from '../types/api';

export function DashboardApiPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create key state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Revealed key state — shown once after creation
  const [revealedKey, setRevealedKey] = useState<ApiKeyCreated | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);

  // Inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    void loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const data = await apiKeys.list();
      setKeys(data.keys);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load API keys.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const created = await apiKeys.create(newKeyName.trim());
      setRevealedKey(created);
      setKeyVisible(false);
      setKeyCopied(false);
      setNewKeyName('');
      setShowCreateForm(false);
      // Add to list without the fullKey
      const { fullKey: _ignored, ...safeKey } = created;
      void _ignored;
      setKeys((prev) => [safeKey, ...prev]);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to create key.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    if (!window.confirm('Revoke this API key? Any integrations using it will stop working immediately.')) return;
    try {
      await apiKeys.revoke(keyId);
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to revoke key.');
    }
  }

  async function handleRename(keyId: string) {
    if (!renameValue.trim()) return;
    setIsRenaming(true);
    try {
      await apiKeys.rename(keyId, renameValue.trim());
      setKeys((prev) =>
        prev.map((k) => (k.id === keyId ? { ...k, name: renameValue.trim() } : k))
      );
      setRenamingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to rename key.');
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleCopyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2500);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">API Keys</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Use API keys to access the ObjectAR API from your own applications.
          </p>
        </div>
        {!showCreateForm && (
          <button
            className="btn-primary gap-2"
            onClick={() => { setShowCreateForm(true); setCreateError(null); }}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New key
          </button>
        )}
      </div>

      {/* ─── One-time key reveal banner ─── */}
      {revealedKey && (
        <div className="mt-4 mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Copy your key now</p>
              <p className="text-xs text-amber-700 mt-0.5">
                This key will not be shown again. Store it in a secure secrets manager or environment variable.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white border border-amber-200 rounded px-3 py-2 font-mono text-xs text-neutral-900 overflow-x-auto whitespace-nowrap">
              {keyVisible ? revealedKey.fullKey : '•'.repeat(revealedKey.fullKey.length)}
            </div>
            <button
              onClick={() => setKeyVisible((v) => !v)}
              className="btn-secondary p-2"
              aria-label={keyVisible ? 'Hide key' : 'Show key'}
              title={keyVisible ? 'Hide key' : 'Show key'}
            >
              {keyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => void handleCopyKey(revealedKey.fullKey)}
              className="btn-primary p-2"
              aria-label="Copy key"
              title="Copy to clipboard"
            >
              {keyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            className="text-xs text-amber-600 hover:text-amber-800 mt-3 transition-colors"
          >
            I've copied my key: dismiss
          </button>
        </div>
      )}

      {/* ─── Create key form ─── */}
      {showCreateForm && (
        <form onSubmit={(e) => void handleCreate(e)} className="card p-5 mb-6 mt-4">
          <h2 className="text-sm font-semibold text-neutral-900 mb-3">Create new API key</h2>
          <label htmlFor="key-name" className="label">Key name</label>
          <input
            id="key-name"
            type="text"
            className="input mb-1"
            placeholder="e.g. Production server"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            maxLength={64}
            required
            autoFocus
          />
          <p className="text-xs text-neutral-400 mb-3">
            Give it a descriptive name so you can identify it later.
          </p>
          {createError && (
            <p role="alert" className="text-xs text-red-600 mb-2">{createError}</p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={isCreating || !newKeyName.trim()} className="btn-primary">
              {isCreating ? 'Creating…' : 'Create key'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreateForm(false); setCreateError(null); setNewKeyName(''); }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ─── Error banner ─── */}
      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-100 rounded text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {/* ─── Keys list ─── */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && keys.length === 0 && !showCreateForm && !revealedKey && (
        <div className="text-center py-12 border border-dashed border-neutral-200 rounded-lg">
          <p className="text-sm font-medium text-neutral-700 mb-1">No API keys yet</p>
          <p className="text-xs text-neutral-500 mb-4">
            Create a key to start integrating with the ObjectAR API.
          </p>
          <button
            className="btn-primary gap-2"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Create your first key
          </button>
        </div>
      )}

      {!isLoading && keys.length > 0 && (
        <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden">
          {keys.map((key) => (
            <div key={key.id} className="bg-white px-4 py-3">
              {renamingId === key.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input flex-1 py-1 text-sm"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    maxLength={64}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleRename(key.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                  />
                  <button
                    onClick={() => void handleRename(key.id)}
                    disabled={isRenaming}
                    className="btn-primary text-xs py-1 px-3"
                  >
                    {isRenaming ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setRenamingId(null)} className="btn-secondary text-xs py-1 px-3">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{key.name}</p>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">
                      {key.keyPrefix}…
                      <span className="font-sans ml-2 text-neutral-400">
                        {key.lastUsedAt
                          ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                          : 'Never used'}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setRenamingId(key.id); setRenameValue(key.name); }}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors rounded"
                      aria-label={`Rename ${key.name}`}
                      title="Rename"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => void handleRevoke(key.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors rounded"
                      aria-label={`Revoke ${key.name}`}
                      title="Revoke key"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── Usage guide ─── */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold text-neutral-900 mb-3">Using your key</h2>
        <pre className="bg-neutral-900 text-neutral-100 rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed">
{`# Create an AR job
curl -X POST https://api.objectar.example.com/api/v1/ar/jobs \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -F "images=@photo1.jpg" \\
  -F "consentGiven=true"

# Check job status
curl https://api.objectar.example.com/api/v1/ar/jobs/JOB_ID \\
  -H "Authorization: Bearer YOUR_KEY"`}
        </pre>
        <p className="text-xs text-neutral-500 mt-2">
          Full API reference is available in the{' '}
          <a href="/docs/api" className="underline hover:text-neutral-700">API documentation</a>.
        </p>
      </section>
    </div>
  );
}
