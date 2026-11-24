import React, { useState } from 'react';
import { Eye, EyeOff, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { modelIdentity, providerIdFor, webGenerationProvider } from '../../../services/collections/ai/collections.ai.adapters';
import { AISettings, AIProvider, CustomProvider, AIModel } from '../../../services/collections/ai/collections.ai.types';

interface Props {
    settings: AISettings;
    models: AIModel[];
    editable: boolean;
    canSave: boolean;
    notice?: React.ReactNode;
    onUseForSession?: () => void;
    onUpdate: (partial: Partial<AISettings>) => void;
    onSave: (settings: AISettings) => Promise<void>;
    onClose: () => void;
}

const DEFAULT_PROVIDERS: { id: AIProvider; label: string }[] = [
    { id: 'anthropic', label: 'Anthropic' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'google', label: 'Google' },
    { id: 'deepseek', label: 'DeepSeek' },
];

const EMPTY_CUSTOM_PROVIDER = { label: '', baseUrl: '', apiKeyLabel: '' };
const EMPTY_CUSTOM_MODEL = { name: '', modelId: '' };

function slugify(label: string): string {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const CollectionAISettings: React.FC<Props> = ({
    settings,
    models,
    editable,
    canSave,
    notice,
    onUseForSession,
    onUpdate: onSettingsUpdate,
    onSave,
    onClose,
}) => {
    const [showKey, setShowKey] = useState(false);
    const [showAddProvider, setShowAddProvider] = useState(false);
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
    const [newProvider, setNewProvider] = useState(EMPTY_CUSTOM_PROVIDER);
    const [newModel, setNewModel] = useState(EMPTY_CUSTOM_MODEL);
    const [showAddModel, setShowAddModel] = useState(false);
    const [providerError, setProviderError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);

    const onUpdate = (partial: Partial<AISettings>) => {
        setSaveStatus('idle');
        setSaveError(null);
        onSettingsUpdate(partial);
    };

    const activeProvider = providerIdFor(settings.provider, settings.activeCustomProviderId);
    const generationProvider = webGenerationProvider(settings);
    const modelsForProvider = Array.from(new Map(
        [...models, ...settings.customModels]
            .filter(model => providerIdFor(model.provider, model.customProviderId) === activeProvider)
            .map(model => [model.id, model]),
    ).values());

    // ── Handlers ─────────────────────────────────────────────────────────────

    const selectProvider = (id: AIProvider, customProviderId?: string) => {
        if (settings.provider === id && settings.activeCustomProviderId === customProviderId) return;
        setShowKey(false);
        setNewModel(EMPTY_CUSTOM_MODEL);
        setShowAddModel(false);
        setExpandedProvider(customProviderId ?? null);
        onUpdate({
            provider: id,
            modelId: settings.modelIdsByProvider?.[providerIdFor(id, customProviderId)] ?? models.find(model => model.provider === id)?.id ?? '',
            activeCustomProviderId: customProviderId ?? undefined,
        });
    };

    const handleAddProvider = () => {
        setProviderError(null);
        if (settings.customProviders.length >= 50) { setProviderError('You can save up to 50 custom providers.'); return; }
        if (!newProvider.label.trim()) { setProviderError('Name is required.'); return; }
        if (!newProvider.baseUrl.trim()) { setProviderError('Base URL is required.'); return; }

        const id = slugify(newProvider.label).slice(0, 90) || `custom-${Date.now()}`;
        if (settings.customProviders.some(p => p.id === id)) {
            setProviderError('A provider with that name already exists.');
            return;
        }

        let baseUrl: string;
        try {
            const url = new URL(newProvider.baseUrl.trim());
            if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.href.length > 2000) {
                throw new Error();
            }
            baseUrl = url.href;
        } catch {
            setProviderError('Enter an HTTPS URL without credentials, a query, or a fragment.');
            return;
        }
        const cp: CustomProvider = { id, label: newProvider.label.trim(), baseUrl, ...(newProvider.apiKeyLabel.trim() ? { apiKeyLabel: newProvider.apiKeyLabel.trim() } : {}) };

        onUpdate({ customProviders: [...settings.customProviders, cp], provider: 'custom', activeCustomProviderId: cp.id, modelId: '' });
        setNewProvider(EMPTY_CUSTOM_PROVIDER);
        setShowAddProvider(false);
        setShowAddModel(false);
        setNewModel(EMPTY_CUSTOM_MODEL);
        setExpandedProvider(cp.id);
    };

    const handleRemoveProvider = (cpId: string) => {
        const updatedProviders = settings.customProviders.filter(p => p.id !== cpId);
        const updatedModels = settings.customModels.filter(m => m.customProviderId !== cpId);
        const isActive = settings.provider === 'custom' && settings.activeCustomProviderId === cpId;
        onUpdate({
            customProviders: updatedProviders,
            customModels: updatedModels,
            apiKeys: Object.fromEntries(Object.entries(settings.apiKeys).filter(([id]) => id !== `custom:${cpId}` && id !== cpId)),
            modelIdsByProvider: Object.fromEntries(Object.entries(settings.modelIdsByProvider ?? {}).filter(([id]) => id !== `custom:${cpId}`)),
            ...(isActive ? { activeCustomProviderId: undefined, provider: 'anthropic', modelId: settings.modelIdsByProvider?.anthropic ?? models.find(model => model.provider === 'anthropic')?.id ?? '' } : {}),
        });
        setNewModel(EMPTY_CUSTOM_MODEL);
    };

    const handleAddModel = (provider: AIProvider, customProviderId?: string) => {
        const rawId = newModel.modelId.trim();
        const name = newModel.name.trim() || rawId;
        const id = modelIdentity(providerIdFor(provider, customProviderId), rawId);
        if (!rawId || id.length > 300 || settings.customModels.length >= 500 || [...models, ...settings.customModels].some(model => model.id === id)) return;
        const model: AIModel = { id, modelId: rawId, name, provider, contextWindow: 0, customProviderId, source: 'manual' };
        const isActive = providerIdFor(provider, customProviderId) === activeProvider;
        onUpdate({ customModels: [...settings.customModels, model], ...(isActive ? { modelId: id } : {}) });
        setNewModel(EMPTY_CUSTOM_MODEL);
    };

    const handleRemoveModel = (modelId: string) => {
        onUpdate({
            customModels: settings.customModels.filter(model => model.id !== modelId),
            modelIdsByProvider: Object.fromEntries(Object.entries(settings.modelIdsByProvider ?? {}).filter(([, id]) => id !== modelId)),
            ...(settings.modelId === modelId ? { modelId: '' } : {}),
        });
    };

    const renderAddModel = (provider: AIProvider, customProviderId?: string) => (
        <div className="flex flex-wrap gap-2">
            <input aria-label="Model display name" placeholder="Display name" value={newModel.name} maxLength={300}
                onChange={event => setNewModel(previous => ({ ...previous, name: event.target.value }))}
                className="min-w-0 flex-1 rounded border px-2 py-1 text-sm" />
            <input aria-label="Model ID" placeholder="Model ID" value={newModel.modelId} maxLength={Math.min(200, 299 - providerIdFor(provider, customProviderId).length)}
                onChange={event => setNewModel(previous => ({ ...previous, modelId: event.target.value }))}
                className="min-w-0 flex-1 rounded border px-2 py-1 text-sm" />
            <button onClick={() => handleAddModel(provider, customProviderId)}
                disabled={!newModel.modelId.trim() || settings.customModels.length >= 500 || [...models, ...settings.customModels].some(
                    model => model.id === modelIdentity(providerIdFor(provider, customProviderId), newModel.modelId.trim())
                )}
                className="rounded bg-orange-600 px-2 py-1 text-sm text-white disabled:opacity-40">
                Add Model
            </button>
        </div>
    );

    const handleSave = async () => {
        setSaveStatus('saving');
        setSaveError(null);
        try {
            await onSave(settings);
            setSaveStatus('success');
        } catch (err: any) {
            setSaveStatus('error');
            setSaveError(err?.message ?? 'Could not save settings. Please try again.');
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">AI Settings</h2>
                <p className="text-xs text-gray-500 mt-0.5">Configure the model used to generate collections</p>
            </div>

            {notice && <div className="space-y-2 border-b border-gray-200 p-4 text-sm">{notice}</div>}

            <fieldset disabled={!editable || saveStatus === 'saving'} className="min-w-0 space-y-5 overflow-y-auto p-4 disabled:opacity-70">

                {/* ── Provider selector ───────────────────────────────────── */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>

                    <div className="grid grid-cols-2 gap-2">
                        {DEFAULT_PROVIDERS.map(p => (
                            <button
                                key={p.id}
                                aria-pressed={settings.provider === p.id}
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
                                return (
                                    <div key={cp.id} className={`rounded-lg border ${isActive ? 'border-orange-500' : 'border-gray-200'}`}>
                                        {/* Header row */}
                                        <div className="flex items-center gap-1 px-3 py-2">
                                            <button
                                                aria-pressed={isActive}
                                                onClick={() => selectProvider('custom', cp.id)}
                                                className={`flex-1 text-left text-sm font-medium transition-colors ${isActive ? 'text-orange-700' : 'text-gray-600'}`}
                                            >
                                                {cp.label}
                                            </button>
                                            <button
                                                aria-label={`Manage models for ${cp.label}`}
                                                onClick={() => { setNewModel(EMPTY_CUSTOM_MODEL); setShowAddModel(false); setExpandedProvider(isExpanded ? null : cp.id); }}
                                                className="p-1 text-gray-400 hover:text-gray-600"
                                            >
                                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                            <button
                                                aria-label={`Remove provider ${cp.label}`}
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

                                                {/* Existing models */}
                                                {cpModels.length > 0 && (
                                                    <div className="space-y-1">
                                                        {cpModels.map(m => (
                                                            <div key={m.id} className="flex items-center gap-2 text-xs py-0.5">
                                                                <span className="flex-1 text-gray-700 truncate">{m.name !== m.id ? m.name : ''}</span>
                                                                <span className="text-gray-400 font-mono truncate">{m.id}</span>
                                                                <button
                                                                    aria-label={`Remove model ${m.name}`}
                                                                    onClick={() => handleRemoveModel(m.id)}
                                                                    className="text-gray-400 hover:text-red-500 flex-shrink-0"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {renderAddModel('custom', cp.id)}
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
                                maxLength={200}
                                value={newProvider.label}
                                onChange={e => setNewProvider(v => ({ ...v, label: e.target.value }))}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            <input
                                placeholder="API endpoint URL"
                                maxLength={2000}
                                value={newProvider.baseUrl}
                                onChange={e => setNewProvider(v => ({ ...v, baseUrl: e.target.value }))}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            <input
                                placeholder="API key label (optional)"
                                maxLength={200}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="collection-ai-model">Model</label>
                    <select
                        id="collection-ai-model"
                        value={settings.modelId}
                        onChange={e => onUpdate({ modelId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="">Select a model...</option>
                        {settings.modelId && !modelsForProvider.some(model => model.id === settings.modelId) && (
                            <option value={settings.modelId}>{settings.modelId.replace(activeProvider + ':', '')}</option>
                        )}
                        {modelsForProvider.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    {settings.provider !== 'custom' && (
                        <div className="mt-2 space-y-2">
                            {settings.customModels.filter(model => model.provider === settings.provider).map(model => (
                                <div key={model.id} className="flex items-center justify-between gap-2 text-sm">
                                    <span className="truncate">{model.name}</span>
                                    <button aria-label={`Remove model ${model.name}`} onClick={() => handleRemoveModel(model.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                            {showAddModel ? renderAddModel(settings.provider) : (
                                <button className="text-sm text-orange-700" onClick={() => { setExpandedProvider(null); setNewModel(EMPTY_CUSTOM_MODEL); setShowAddModel(true); }}>
                                    Add Model
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ── API Key ─────────────────────────────────────────────── */}
                {!generationProvider ? (
                    <p className="text-sm text-gray-600">Use the iOS or Android app to generate collections with this provider.</p>
                ) : <div>
                    <label htmlFor="collection-ai-key" className="block text-sm font-medium text-gray-700 mb-2">Provider API key</label>
                    <div className="relative">
                        <input
                            id="collection-ai-key"
                            type={showKey ? 'text' : 'password'}
                            autoComplete="off"
                            maxLength={4096}
                            value={settings.apiKey}
                            onChange={e => onUpdate({ apiKey: e.target.value })}
                            placeholder={`Enter your ${generationProvider === 'qwen' ? 'QwenCloud pay-as-you-go' : settings.provider} key`}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                            type="button"
                            aria-label={showKey ? 'Hide key' : 'Show key'}
                            onClick={() => setShowKey(v => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        Saving remembers your key in this browser tab for AI Collections. Your provider may charge for generation. Relevant inventory is included in the request.
                    </p>
                </div>}
            </fieldset>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div className="p-4 border-t border-gray-200 flex gap-2">
                <button
                    onClick={onClose}
                    disabled={saveStatus === 'saving'}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    {saveStatus === 'success' ? 'Done' : 'Cancel'}
                </button>
                <button
                    onClick={handleSave}
                    disabled={!canSave || saveStatus === 'saving'}
                    className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved' : 'Save Settings'}
                </button>
            </div>
            {onUseForSession && (
                <button onClick={onUseForSession} className="mx-4 mb-4 rounded-lg border border-orange-300 px-3 py-2 text-sm text-orange-800">
                    Use for this session
                </button>
            )}
            {saveStatus === 'error' && (
                <p role="alert" className="px-4 pb-3 text-xs text-red-600">{saveError}</p>
            )}
        </div>
    );
};

export default CollectionAISettings;
