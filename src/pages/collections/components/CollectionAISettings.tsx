import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, Plus, Trash2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { AI_MODELS } from '../../../services/collections/collections.ai';
import { AISettings, AIProvider, CustomProvider, AIModel } from '../../../services/collections/collections.ai.types';

interface Props {
    settings: AISettings;
    onUpdate: (partial: Partial<AISettings>) => void;
    onSave: (settings: AISettings) => void;
    isVerifying: boolean;
    verifyStatus: 'idle' | 'success' | 'error';
    verifyError: string | null;
    onVerify: () => void;
    onClose: () => void;
}

const DEFAULT_PROVIDERS: { id: AIProvider; label: string }[] = [
    { id: 'anthropic', label: 'Anthropic' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'google', label: 'Google' },
];

const EMPTY_CUSTOM_PROVIDER = { label: '', baseUrl: '', apiKeyLabel: '' };
const EMPTY_CUSTOM_MODEL = { name: '', modelId: '' };

function slugify(label: string): string {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function fetchModelsForProvider(baseUrl: string, apiKey: string): Promise<{ id: string }[]> {
    // Normalize baseUrl to just the base path (strip /chat/completions and anything after)
    const base = baseUrl.replace(/\/chat\/completions.*$/i, '').replace(/\/$/, '');
    const res = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Provider returned ${res.status}`);
    const data = await res.json();
    // OpenAI-compatible format: { data: [{ id, ... }] }
    const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
    if (list.length === 0) throw new Error('No models returned by provider');
    return list;
}

const CollectionAISettings: React.FC<Props> = ({
    settings,
    onUpdate,
    onSave,
    isVerifying,
    verifyStatus,
    verifyError,
    onVerify,
    onClose,
}) => {
    const [showKey, setShowKey] = useState(false);
    const [showAddProvider, setShowAddProvider] = useState(false);
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
    const [newProvider, setNewProvider] = useState(EMPTY_CUSTOM_PROVIDER);
    const [newModel, setNewModel] = useState(EMPTY_CUSTOM_MODEL);
    const [providerError, setProviderError] = useState<string | null>(null);

    // Per-provider fetch state
    const [fetchingModels, setFetchingModels] = useState<string | null>(null); // cpId
    const [fetchModelStatus, setFetchModelStatus] = useState<Record<string, 'success' | 'error'>>({});
    const [fetchModelError, setFetchModelError] = useState<Record<string, string>>({});

    // ── Derived ──────────────────────────────────────────────────────────────

    const selectedCustomProvider = settings.provider === 'custom'
        ? settings.customProviders.find(cp => {
            const m = [...settings.customModels].find(m => m.id === settings.modelId);
            return m?.customProviderId === cp.id;
        })
        : undefined;

    const modelsForProvider = (() => {
        if (settings.provider === 'custom') {
            return settings.customModels.filter(
                m => m.customProviderId === settings.activeCustomProviderId,
            );
        }
        return AI_MODELS.filter(m => m.provider === settings.provider);
    })();

    // ── Handlers ─────────────────────────────────────────────────────────────

    const selectProvider = (id: AIProvider, customProviderId?: string) => {
        onUpdate({
            provider: id,
            modelId: '',
            activeCustomProviderId: customProviderId ?? undefined,
        });
    };

    const handleAddProvider = () => {
        setProviderError(null);
        if (!newProvider.label.trim()) { setProviderError('Name is required.'); return; }
        if (!newProvider.baseUrl.trim()) { setProviderError('Base URL is required.'); return; }

        const id = slugify(newProvider.label) || `custom-${Date.now()}`;
        if (settings.customProviders.some(p => p.id === id)) {
            setProviderError('A provider with that name already exists.');
            return;
        }

        const cp: CustomProvider = {
            id,
            label: newProvider.label.trim(),
            baseUrl: newProvider.baseUrl.trim(),
            apiKeyLabel: newProvider.apiKeyLabel.trim() || undefined,
        };

        onUpdate({ customProviders: [...settings.customProviders, cp] });
        setNewProvider(EMPTY_CUSTOM_PROVIDER);
        setShowAddProvider(false);
        setExpandedProvider(cp.id);
    };

    const handleRemoveProvider = (cpId: string) => {
        const updatedProviders = settings.customProviders.filter(p => p.id !== cpId);
        const updatedModels = settings.customModels.filter(m => m.customProviderId !== cpId);
        const activeModelGone = settings.customModels.find(
            m => m.id === settings.modelId && m.customProviderId === cpId,
        );
        onUpdate({
            customProviders: updatedProviders,
            customModels: updatedModels,
            ...(activeModelGone ? { provider: 'anthropic', modelId: '' } : {}),
        });
    };

    const handleFetchModels = async (cp: CustomProvider) => {
        const apiKey = settings.apiKeys[cp.id] ?? settings.apiKey ?? '';
        setFetchingModels(cp.id);
        setFetchModelStatus(s => ({ ...s, [cp.id]: undefined as any }));
        setFetchModelError(s => ({ ...s, [cp.id]: '' }));

        try {
            const fetched = await fetchModelsForProvider(cp.baseUrl, apiKey);
            const existing = new Set(settings.customModels.filter(m => m.customProviderId === cp.id).map(m => m.id));
            const newModels: AIModel[] = fetched
                .filter(m => !existing.has(m.id))
                .map(m => ({
                    id: m.id,
                    name: m.id, // providers rarely return a display name
                    provider: 'custom',
                    contextWindow: 0,
                    customProviderId: cp.id,
                }));

            if (newModels.length === 0 && existing.size > 0) {
                setFetchModelStatus(s => ({ ...s, [cp.id]: 'success' }));
            } else if (newModels.length === 0) {
                throw new Error('No new models found');
            } else {
                onUpdate({ customModels: [...settings.customModels, ...newModels] });
                setFetchModelStatus(s => ({ ...s, [cp.id]: 'success' }));
            }
        } catch (err: any) {
            setFetchModelStatus(s => ({ ...s, [cp.id]: 'error' }));
            setFetchModelError(s => ({ ...s, [cp.id]: err.message ?? 'Failed to fetch models' }));
        } finally {
            setFetchingModels(null);
        }
    };

    const handleAddModel = (cpId: string) => {
        if (!newModel.name.trim() || !newModel.modelId.trim()) return;
        const model: AIModel = {
            id: newModel.modelId.trim(),
            name: newModel.name.trim(),
            provider: 'custom',
            contextWindow: 0,
            customProviderId: cpId,
        };
        onUpdate({ customModels: [...settings.customModels, model] });
        setNewModel(EMPTY_CUSTOM_MODEL);
    };

    const handleRemoveModel = (modelId: string) => {
        onUpdate({
            customModels: settings.customModels.filter(m => m.id !== modelId),
            ...(settings.modelId === modelId ? { modelId: '' } : {}),
        });
    };

    const handleSave = () => { onSave(settings); onClose(); };

    const apiKeyPlaceholder = selectedCustomProvider?.apiKeyLabel
        || `Enter your ${settings.provider === 'custom' ? 'API' : settings.provider} key`;

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">AI Settings</h2>
                <p className="text-xs text-gray-500 mt-0.5">Configure the model used to generate collections</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">

                {/* ── Provider selector ───────────────────────────────────── */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>

                    <div className="grid grid-cols-3 gap-2">
                        {DEFAULT_PROVIDERS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => selectProvider(p.id)}
                                className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${settings.provider === p.id
                                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom providers */}
                    {settings.customProviders.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {settings.customProviders.map(cp => {
                                const isActive = settings.provider === 'custom' && settings.activeCustomProviderId === cp.id;
                                const isExpanded = expandedProvider === cp.id;
                                const cpModels = settings.customModels.filter(m => m.customProviderId === cp.id);
                                const isFetching = fetchingModels === cp.id;
                                const fetchStatus = fetchModelStatus[cp.id];
                                const fetchError = fetchModelError[cp.id];

                                return (
                                    <div key={cp.id} className={`rounded-lg border ${isActive ? 'border-orange-500' : 'border-gray-200'}`}>
                                        {/* Header row */}
                                        <div className="flex items-center gap-1 px-3 py-2">
                                            <button
                                                onClick={() => selectProvider('custom', cp.id)}
                                                className={`flex-1 text-left text-sm font-medium transition-colors ${isActive ? 'text-orange-700' : 'text-gray-600'}`}
                                            >
                                                {cp.label}
                                            </button>
                                            <button
                                                onClick={() => setExpandedProvider(isExpanded ? null : cp.id)}
                                                className="p-1 text-gray-400 hover:text-gray-600"
                                            >
                                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                            <button
                                                onClick={() => handleRemoveProvider(cp.id)}
                                                className="p-1 text-gray-400 hover:text-red-500"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Expanded model management */}
                                        {isExpanded && (
                                            <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-3">
                                                <p className="text-xs text-gray-400 font-mono truncate">{cp.baseUrl}</p>

                                                {/* Fetch models button */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleFetchModels(cp)}
                                                        disabled={isFetching}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {isFetching
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <RefreshCw className="w-3 h-3" />
                                                        }
                                                        {isFetching ? 'Fetching...' : 'Fetch Available Models'}
                                                    </button>
                                                    {fetchStatus === 'success' && (
                                                        <span className="flex items-center gap-1 text-xs text-green-600">
                                                            <CheckCircle className="w-3 h-3" /> Done
                                                        </span>
                                                    )}
                                                </div>

                                                {fetchStatus === 'error' && (
                                                    <div className="flex items-start gap-1.5 text-xs text-red-600">
                                                        <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                                        <span>{fetchError} — add models manually below.</span>
                                                    </div>
                                                )}

                                                {/* Existing models */}
                                                {cpModels.length > 0 && (
                                                    <div className="space-y-1">
                                                        {cpModels.map(m => (
                                                            <div key={m.id} className="flex items-center gap-2 text-xs py-0.5">
                                                                <span className="flex-1 text-gray-700 truncate">{m.name !== m.id ? m.name : ''}</span>
                                                                <span className="text-gray-400 font-mono truncate">{m.id}</span>
                                                                <button
                                                                    onClick={() => handleRemoveModel(m.id)}
                                                                    className="text-gray-400 hover:text-red-500 flex-shrink-0"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Manual add model row */}
                                                <div>
                                                    <p className="text-xs text-gray-400 mb-1.5">Add manually</p>
                                                    <div className="flex gap-1.5">
                                                        <input
                                                            placeholder="Display name"
                                                            value={newModel.name}
                                                            onChange={e => setNewModel(v => ({ ...v, name: e.target.value }))}
                                                            className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                        />
                                                        <input
                                                            placeholder="model-id"
                                                            value={newModel.modelId}
                                                            onChange={e => setNewModel(v => ({ ...v, modelId: e.target.value }))}
                                                            className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                        />
                                                        <button
                                                            onClick={() => handleAddModel(cp.id)}
                                                            disabled={!newModel.name.trim() || !newModel.modelId.trim()}
                                                            className="px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add provider form / button */}
                    {showAddProvider ? (
                        <div className="mt-2 p-3 border border-dashed border-gray-300 rounded-lg space-y-2">
                            <p className="text-xs font-medium text-gray-700">New Provider</p>
                            <input
                                placeholder="Name (e.g. Mistral, Ollama)"
                                value={newProvider.label}
                                onChange={e => setNewProvider(v => ({ ...v, label: e.target.value }))}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            <input
                                placeholder="API endpoint URL"
                                value={newProvider.baseUrl}
                                onChange={e => setNewProvider(v => ({ ...v, baseUrl: e.target.value }))}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            <input
                                placeholder="API key label (optional)"
                                value={newProvider.apiKeyLabel}
                                onChange={e => setNewProvider(v => ({ ...v, apiKeyLabel: e.target.value }))}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            {providerError && <p className="text-xs text-red-600">{providerError}</p>}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowAddProvider(false); setNewProvider(EMPTY_CUSTOM_PROVIDER); setProviderError(null); }}
                                    className="flex-1 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddProvider}
                                    className="flex-1 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                                >
                                    Add Provider
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddProvider(true)}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Provider
                        </button>
                    )}
                </div>

                {/* ── Model selector ──────────────────────────────────────── */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                    <select
                        value={settings.modelId}
                        onChange={e => onUpdate({ modelId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="">Select a model...</option>
                        {modelsForProvider.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    {settings.modelId && (() => {
                        const allModels = [...AI_MODELS, ...settings.customModels];
                        const ctx = allModels.find(m => m.id === settings.modelId)?.contextWindow ?? 0;
                        return ctx > 0 ? (
                            <p className="text-xs text-gray-400 mt-1">Context: {ctx.toLocaleString()} tokens</p>
                        ) : null;
                    })()}
                </div>

                {/* ── API Key ─────────────────────────────────────────────── */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                    <div className="relative">
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={settings.apiKey}
                            onChange={e => onUpdate({ apiKey: e.target.value })}
                            placeholder={apiKeyPlaceholder}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey(v => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        Your key is stored locally and never sent to our servers.
                    </p>
                </div>

                {/* ── Verify ──────────────────────────────────────────────── */}
                <div>
                    <button
                        onClick={onVerify}
                        disabled={!settings.apiKey || !settings.modelId || isVerifying}
                        className="w-full py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isVerifying
                            ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</>
                            : 'Test Connection'
                        }
                    </button>
                    {verifyStatus === 'success' && (
                        <div className="mt-2 flex items-center gap-1.5 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" />Connection successful
                        </div>
                    )}
                    {verifyStatus === 'error' && (
                        <div className="mt-2 flex items-start gap-1.5 text-red-600 text-sm">
                            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{verifyError || 'Connection failed'}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div className="p-4 border-t border-gray-200 flex gap-2">
                <button
                    onClick={onClose}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                >
                    Save Settings
                </button>
            </div>
        </div>
    );
};

export default CollectionAISettings;