import BusinessActionButton from '../../../mainComponents/ui/BusinessActionButton';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Settings,
    Send,
    Loader2,
    Sparkles,
    RotateCcw,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import CollectionAIScopeSelector, { AIScopeSelection, ScopeContentType } from './CollectionAIScopeSelector';
import { useAuthContext } from '../../../contexts/AuthContext';

import CollectionAISettings from './CollectionAISettings';
import { loadAPISettings, saveAPISettings } from '../../../services/collections/ai/collections.ai.api';
import { loadAICredentials, saveAICredentials } from '../../../services/collections/ai/collections.ai.credentials';
import { builtInModels, credentialFor, modelIdentity, providerIdFor, webGenerationProvider } from '../../../services/collections/ai/collections.ai.adapters';
import type { AIModel, AISettings } from '../../../services/collections/ai/collections.ai.types';
import { ApiError, collectionsApiRequest, errorMessage } from '../../../services/collections/collectionsApi';

const SUGGESTION_PROMPTS = [
    'Toilet installation',
    'Kitchen faucet replacement',
    'Electrical panel upgrade',
    'HVAC filter replacement and tune-up',
    'Drywall patch and paint',
    'Bathroom tile installation',
];

const fallbackModels = builtInModels();
const defaultSettings: AISettings = {
    provider: 'anthropic', modelId: fallbackModels[0].id, apiKey: '', apiKeys: {}, customProviders: [], customModels: [],
};
type Selection = { contentType: 'products' | 'labor' | 'tools' | 'equipment'; itemId: number; quantity: number };
type Proposal = { name: string; description: string; items: Selection[] };
type Generated = { collection: Proposal; preview: (Selection & { name: string })[] };
const permissions = ['read:collections', 'write:collections', 'read:inventory'];
const field = 'w-full rounded-lg border border-gray-300 p-2 disabled:bg-gray-100';

// Remount on account/company changes so credentials and pending work do not
// carry over. All provider traffic uses the authenticated API, never the relay.
export default function CollectionAICreation() {
    const { currentUser, membershipId } = useAuthContext();
    const [params] = useSearchParams();
    const target = params.get('appendTo');
    const collectionId = target && /^\d+$/.test(target) ? Number(target) : 0;
    if (target !== null && (!collectionId || collectionId > 2147483647)) {
        return <p role="alert">Invalid collection ID.</p>;
    }
    const scope = JSON.stringify([currentUser?.uid, membershipId]);
    const storageKey = currentUser?.uid ? `ezboss:collection-ai-credentials:${scope}` : undefined;
    return <CollectionAIForm key={JSON.stringify([scope, collectionId])} storageKey={storageKey} collectionId={collectionId} />;
}

function CollectionAIForm({ storageKey, collectionId }: { storageKey?: string; collectionId: number }) {
    const { canPerform, currentUser } = useAuthContext();
    const navigate = useNavigate();
    const backPath = collectionId ? `/collections/${collectionId}` : '/collections/create';
    const [targetName, setTargetName] = useState('');
    const [targetError, setTargetError] = useState('');
    const [settings, setSettings] = useState(defaultSettings);
    const [models, setModels] = useState(fallbackModels);
    const [draft, setDraft] = useState<AISettings | null>(null);
    const [settingsError, setSettingsError] = useState<{ message: string; canUseForSession: boolean } | null>(null);
    const [settingsVersion, setSettingsVersion] = useState<number | null>(null);
    const [settingsRetry, setSettingsRetry] = useState(0);
    const [savingSettings, setSavingSettings] = useState(false);
    const { provider } = settings;
    const providerId = providerIdFor(provider, settings.activeCustomProviderId);
    const selectedModel = [...models, ...settings.customModels].find(entry => entry.id === settings.modelId);
    const prefix = `${providerId}:`;
    const model = selectedModel?.modelId ?? (settings.modelId.startsWith(prefix) ? settings.modelId.slice(prefix.length) : settings.modelId);
    const generationProvider = webGenerationProvider(settings);
    const apiKey = generationProvider === 'qwen'
        ? settings.apiKeys[providerId] ?? ''
        : generationProvider ? credentialFor(settings) : '';
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [showScopeSelector, setShowScopeSelector] = useState(false);
    const [scopeSelection, setScopeSelection] = useState<AIScopeSelection | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollChat = useRef(false);

    const [generated, setGenerated] = useState<Generated | null>(null);
    const [busy, setBusy] = useState<'generate' | 'save' | null>(null);
    const [error, setError] = useState('');
    const controller = useRef<AbortController | null>(null);
    const saveRequest = useRef<{ content: string; id: string } | null>(null);
    // A failed save may have committed. Freeze its content until the same
    // idempotent request confirms the result, avoiding duplicate collections.
    const [saveUnconfirmed, setSaveUnconfirmed] = useState(false);
    const allowed = permissions.every(canPerform);
    const targetReady = !collectionId || !!targetName;
    useEffect(() => {
        if (!collectionId || !allowed) return;
        const request = new AbortController();
        collectionsApiRequest<{ name: string }>(`/collections/${collectionId}`, { signal: request.signal })
            .then(target => { if (!request.signal.aborted) setTargetName(target.name); })
            .catch(cause => {
                if (!request.signal.aborted) setTargetError(errorMessage(cause, 'Could not load this collection.'));
            });
        return () => request.abort();
    }, [allowed, collectionId]);
    useEffect(() => () => { controller.current?.abort(); }, []);

    useEffect(() => {
        if (!allowed) return;
        let active = true;
        const request = new AbortController();
        const timer = window.setTimeout(() => request.abort(), 12000);
        setSettingsError(null);
        loadAPISettings(request.signal).then(record => {
            if (!active) return;
            if (!record || !Number.isSafeInteger(record.version) || record.version < 0 ||
                (record.settings !== null && (!record.settings || typeof record.settings.modelId !== 'string' ||
                    !Array.isArray(record.settings.customProviders) || !Array.isArray(record.settings.customModels)))) {
                throw new Error('The server returned invalid settings.');
            }
            const catalog = record.models;
            const available: AIModel[] = catalog ? Object.entries(catalog).flatMap(([provider, rows]) =>
                rows.map(entry => ({
                    ...entry, provider: provider as AIModel['provider'],
                    id: modelIdentity(provider, entry.modelId), contextWindow: 0,
                })),
            ) : fallbackModels;
            setModels(available);
            const apiKeys = loadAICredentials(storageKey);
            if (record.settings) {
                const stored = record.settings;
                const id = providerIdFor(stored.provider, stored.activeCustomProviderId);
                setSettings({
                    ...stored, apiKey: apiKeys[id] ?? '', apiKeys,
                    modelIdsByProvider: { ...stored.modelIdsByProvider, [id]: stored.modelId },
                });
            }
            else {
                const first = available.find(entry => entry.provider === defaultSettings.provider);
                setSettings({ ...defaultSettings, modelId: first?.id ?? '', apiKey: apiKeys[defaultSettings.provider] ?? '', apiKeys });
            }
            setDraft(null);
            setSettingsVersion(record.version);
        }).catch(cause => {
            if (active) setSettingsError({
                message: request.signal.aborted ? 'The request timed out.' : errorMessage(cause, 'Please try again.'),
                canUseForSession: !(cause instanceof ApiError && (cause.status === 401 || cause.status === 403)),
            });
        }).finally(() => window.clearTimeout(timer));
        return () => { active = false; request.abort(); window.clearTimeout(timer); };
    }, [allowed, settingsRetry, storageKey]);

    function updateDraft(partial: Partial<AISettings>) {
        setDraft(previous => {
            const next = { ...(previous ?? settings), ...partial };
            const id = providerIdFor(next.provider, next.activeCustomProviderId);
            if (partial.apiKey !== undefined) next.apiKeys = { ...next.apiKeys, [id]: partial.apiKey };
            else next.apiKey = next.apiKeys[id] ?? '';
            if (partial.modelId !== undefined) {
                next.modelIdsByProvider = { ...next.modelIdsByProvider, [id]: partial.modelId };
            }
            return next;
        });
    }

    async function saveSettings(next: AISettings) {
        if (!allowed || settingsVersion === null) throw new Error('Wait for AI settings to load.');
        setSavingSettings(true);
        try {
            const saved = await saveAPISettings(next, settingsVersion);
            saveAICredentials(storageKey, next.apiKeys);
            setSettingsVersion(saved.version);
            setSettings(next);
        } finally {
            setSavingSettings(false);
        }
    }

    useEffect(() => {
        if (scrollChat.current) messagesEndRef.current?.scrollIntoView({ block: 'nearest' });
    }, [messages, busy]);

    function resetChat() {
        controller.current?.abort();
        scrollChat.current = false;
        setBusy(null);
        setMessages([]);
        setInputValue('');
        setGenerated(null);
        setError('');
        saveRequest.current = null;
    }

    async function sendMessage(text = inputValue) {
        const prompt = text.trim();
        if (!allowed || !targetReady || busy || savingSettings || saveUnconfirmed || !prompt || !generationProvider || !apiKey.trim() || !model.trim() || model.trim().length > 200) return;
        if (scopeChipCount > 200) {
            setError('Select up to 200 inventory categories before generating.');
            return;
        }
        const request = new AbortController();
        controller.current = request;
        setBusy('generate');
        setError('');
        setInputValue(prompt);
        scrollChat.current = true;
        setMessages(previous => [...previous, { role: 'user', content: prompt }]);
        try {
            const result = await collectionsApiRequest<Generated>('/native-collection-ai/generate', {
                method: 'POST', signal: request.signal, headers: { 'x-ai-key': apiKey.trim() },
                body: JSON.stringify({
                    provider: generationProvider, model: model.trim(), prompt,
                    ...(collectionId ? { collectionId } : {}),
                    ...(scopeChipCount && scopeSelection ? {
                        scope: (Object.keys(scopeSelection) as ScopeContentType[]).flatMap(contentType =>
                            scopeSelection[contentType].map(({ level, id }) => ({ contentType, level, id: Number(id) }))
                        ),
                    } : {}),
                }),
            });
            if (request.signal.aborted) return;
            setGenerated(result);
            setInputValue('');
            saveRequest.current = null;
            setMessages(previous => [...previous, { role: 'assistant', content: collectionId ? 'Review the suggested items before adding them.' : 'Review the suggested inventory below before saving your collection.' }]);
        } catch (cause) {
            if (!request.signal.aborted) setError(errorMessage(cause, 'Generation failed. Your prompt is preserved; please retry.'));
        } finally { if (!request.signal.aborted) setBusy(null); }
    }

    const canSave = !!generated && (collectionId ? generated.collection.items.length > 0 : !!generated.collection.name.trim());

    async function save() {
        if (!allowed || !targetReady || busy || !generated || !canSave) return;
        const payload = collectionId ? { collectionId, items: generated.collection.items } : { collection: generated.collection };
        const content = JSON.stringify(payload);
        if (saveRequest.current?.content !== content) saveRequest.current = { content, id: crypto.randomUUID() };
        const request = new AbortController();
        controller.current = request;
        setBusy('save'); setError(''); setSaveUnconfirmed(true);
        try {
            const result = await collectionsApiRequest<{ id: number }>(collectionId ? '/native-collection-ai/append' : '/native-collection-ai/save', {
                method: 'POST', signal: request.signal,
                body: JSON.stringify({ requestId: saveRequest.current.id, ...payload }),
            });
            if (!request.signal.aborted) navigate(`/collections/${result.id}`);
        } catch (cause) {
            if (request.signal.aborted) return;
            if (collectionId && cause instanceof ApiError && cause.status === 409) {
                setSaveUnconfirmed(false);
                setError(cause.message);
            } else {
                setError(`${errorMessage(cause, 'Save was not confirmed.')} Retry to confirm the same save request.`);
            }
        } finally { if (!request.signal.aborted) setBusy(null); }
    }

    const locked = !!busy || savingSettings || saveUnconfirmed;

    const hasApiKey = allowed && targetReady && !!apiKey.trim() && !!model.trim() && model.trim().length <= 200;
    const scopeChipCount = Object.values(scopeSelection ?? {}).reduce((count, nodes) => count + nodes.length, 0);

    return (
        <div className="min-h-[calc(100vh-8rem)] bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(backPath)}
                        className="flex items-center text-gray-600 hover:text-gray-900 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        Back
                    </button>
                    <div className="w-px h-5 bg-gray-200" />
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold text-gray-900 leading-none">{collectionId ? 'Add items with AI' : 'AI Collection Creator'}</h1>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {model
                                    ? `Using ${model}`
                                    : 'No model selected — open AI Settings'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                        <button
                            onClick={resetChat}
                            disabled={busy === 'save' || saveUnconfirmed}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset
                        </button>
                    )}
                    <button
                        onClick={() => { setDraft(null); setShowSettings(value => !value); }}
                        disabled={savingSettings}
                        aria-expanded={showSettings}
                        aria-controls="collection-ai-settings"
                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${showSettings
                            ? 'border-orange-300 bg-orange-50 text-orange-700'
                            : !hasApiKey
                                ? 'border-orange-400 bg-orange-100 text-orange-800 motion-safe:animate-ai-settings-pulse hover:!animate-none hover:border-orange-600 hover:bg-orange-200 hover:text-orange-950'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        AI Settings
                    </button>
                </div>
            </div>

            {!allowed && <p role="alert" className="p-4">Your company permissions do not allow AI collection creation. You need collection read/write and inventory read access.</p>}
            <div className="flex flex-1 flex-col lg:flex-row">
                {showSettings && (
                    <aside id="collection-ai-settings" className="order-first min-w-0 border-b bg-white lg:order-last lg:w-96 lg:shrink-0 lg:border-b-0 lg:border-l">
                        <CollectionAISettings models={models} settings={draft ?? settings} onUpdate={updateDraft}
                            editable={allowed && (settingsVersion !== null || !!settingsError?.canUseForSession)}
                            canSave={allowed && settingsVersion !== null}
                            onSave={saveSettings}
                            onClose={() => { setDraft(null); setShowSettings(false); }}
                            onUseForSession={allowed && settingsError?.canUseForSession ? () => {
                                setSettings(draft ?? settings);
                                setDraft(null);
                                setShowSettings(false);
                            } : undefined}
                            notice={!allowed ? (
                                <p>AI Settings requires collection read/write and inventory read access.</p>
                            ) : settingsError ? <>
                                <p role="alert">Could not load saved AI settings. {settingsError.message}</p>
                                {settingsError.canUseForSession && <p>You can use a provider and model for this session while saving is unavailable.</p>}
                                <button className="font-medium text-orange-800 underline" disabled={!!busy}
                                    onClick={() => setSettingsRetry(value => value + 1)}>Retry loading settings</button>
                            </> : settingsVersion === null ? <p role="status">Loading saved settings…</p> : undefined}
                        />
                    </aside>
                )}
                {collectionId > 0 && allowed && !targetReady && <p className="p-4" role={targetError ? 'alert' : 'status'}>
                    {targetError || 'Loading collection…'}
                </p>}
                {/* Main chat area */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 p-4 space-y-4">
                        {/* Welcome state */}
                        {messages.length === 0 && (
                            <div className="max-w-xl mx-auto pt-8">
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-100 rounded-full mb-4">
                                        <Sparkles className="w-7 h-7 text-orange-600" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                        {collectionId ? `What should we add to ${targetName || 'this collection'}?` : 'Describe your job'}
                                    </h2>
                                    <p className="text-gray-500 text-sm">
                                        Tell me what you're working on and I'll select the right products, labor, tools,
                                        and equipment from your inventory.
                                    </p>
                                </div>

                                {!hasApiKey && (
                                    <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                                        <Settings className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span>
                                            Open <button
                                                type="button"
                                                onClick={() => setShowSettings(true)}
                                                aria-expanded={showSettings}
                                                aria-controls="collection-ai-settings"
                                                className="font-semibold underline underline-offset-2 hover:text-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 rounded-sm"
                                            >AI Settings</button> to {generationProvider ? 'select a model and add its API key.' : 'select a provider for web generation.'}
                                        </span>
                                    </div>
                                )}

                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                                        Try one of these
                                    </p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {SUGGESTION_PROMPTS.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => sendMessage(s)}
                                                disabled={!hasApiKey || locked}
                                                className="text-left px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat messages */}
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                                        <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                                    </div>
                                )}
                                <div
                                    className={`min-w-0 max-w-lg rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user'
                                        ? 'bg-orange-600 text-white rounded-br-sm'
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                </div>
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {(busy === 'generate') && (
                            <div className="flex justify-start">
                                <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                                    <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                                </div>
                                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                                    Building your collection…
                                    <button type="button" className="underline" onClick={() => {
                                        controller.current?.abort();
                                        setBusy(null);
                                    }}>Cancel</button>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div role="alert" className="max-w-lg mx-auto p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="max-w-lg mx-auto">
                            {generated && <div className="space-y-4 rounded-xl border border-orange-200 bg-white p-4">
                                <h2 className="text-lg font-semibold">Collection Preview</h2>
                                <p className="text-sm text-gray-600">Check the suggested items and quantities before saving. Prices come from your current inventory.</p>
                                {!collectionId && <>
                                <label className="block space-y-1">Collection name
                                    <input className={field} value={generated.collection.name} maxLength={200} disabled={locked} onChange={event => setGenerated({ ...generated, collection: { ...generated.collection, name: event.target.value } })} />
                                </label>
                                <label className="block space-y-1">Description
                                    <textarea className={field} value={generated.collection.description} maxLength={5000} disabled={locked} onChange={event => setGenerated({ ...generated, collection: { ...generated.collection, description: event.target.value } })} />
                                </label>
                                </>}
                                {!generated.collection.items.length && <p>{collectionId ? 'No new inventory items were suggested. Try a different prompt.' : 'No matching inventory items were selected. Revise the job description or save an empty collection.'}</p>}
                                <ul className="divide-y">
                                    {generated.collection.items.map((item, index) => <li key={`${item.contentType}:${item.itemId}`} className="flex flex-wrap items-center gap-3 py-3">
                                        <span className="min-w-0 flex-1 break-words">{generated.preview.find(row => row.contentType === item.contentType && row.itemId === item.itemId)?.name ?? `Item ${item.itemId}`} <span className="text-sm text-gray-500">({item.contentType})</span></span>
                                        <label className="text-sm">Quantity
                                            <input type="number" aria-label={`Quantity for item ${index + 1}`} className="ml-2 w-24 rounded border p-2" min={1} max={100000} step={1} value={item.quantity} disabled={locked} onChange={event => {
                                                const quantity = Number(event.target.value);
                                                if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) return;
                                                setGenerated({ ...generated, collection: { ...generated.collection, items: generated.collection.items.map((row, i) => i === index ? { ...row, quantity } : row) } });
                                            }} />
                                        </label>
                                        <button type="button" className="text-red-700 underline disabled:opacity-50" disabled={locked} onClick={() => setGenerated({ ...generated, collection: { ...generated.collection, items: generated.collection.items.filter((_, i) => i !== index) } })}>Remove</button>
                                    </li>)}
                                </ul>
                                <BusinessActionButton capability="write:collections" requires={['read:collections', 'read:inventory']} disabled={!!busy || !canSave} onClick={() => void save()}
                                    className="rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50">
                                    {busy === 'save' ? 'Saving…' : saveUnconfirmed ? 'Retry saving collection' : collectionId ? 'Add to Collection' : 'Save Collection'}
                                </BusinessActionButton>
                            </div>}
                        </div>

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="bg-white border-t border-gray-200 p-3">
                        {/* Scope chip */}
                        {scopeSelection && scopeChipCount > 0 && (
                            <div className="flex items-center gap-2 mb-2 max-w-3xl mx-auto">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full text-xs text-orange-700">
                                    <SlidersHorizontal className="w-3 h-3" />
                                    <span>
                                        Scoped to {scopeChipCount} categor{scopeChipCount !== 1 ? 'ies' : 'y'}
                                    </span>
                                    <button
                                        onClick={() => setScopeSelection(null)}
                                        className="ml-0.5 hover:text-orange-900"
                                        aria-label="Clear scope"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShowScopeSelector(true)}
                                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                                >
                                    Edit
                                </button>
                            </div>
                        )}

                        <div className="flex items-end gap-2 max-w-3xl mx-auto">
                            {/* Scope button */}
                            <button
                                onClick={() => setShowScopeSelector(true)}
                                title="Scope inventory"
                                disabled={!allowed || locked}
                                className={`p-2.5 rounded-xl border flex-shrink-0 transition-colors ${scopeSelection
                                    ? 'border-orange-300 bg-orange-50 text-orange-600'
                                    : 'border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                            </button>

                            <textarea
                                aria-label="Describe your job"
                                maxLength={4000}
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={event => {
                                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                                        event.preventDefault();
                                        void sendMessage();
                                    }
                                }}
                                placeholder={
                                    hasApiKey
                                        ? 'Describe a job (e.g. "Toilet installation") — press Enter to send'
                                        : 'Add your API key in AI Settings first...'
                                }
                                disabled={locked || !hasApiKey}
                                rows={1}
                                className="min-w-0 flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-400"
                                style={{ maxHeight: 120 }}
                                onInput={e => {
                                    const t = e.currentTarget;
                                    t.style.height = 'auto';
                                    t.style.height = `${t.scrollHeight}px`;
                                }}
                            />
                            <button
                                aria-label="Generate collection"
                                onClick={() => void sendMessage()}
                                disabled={!inputValue.trim() || locked || !hasApiKey}
                                className="p-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-center text-gray-400 mt-1.5">
                            Shift+Enter for new line · Enter to send
                        </p>
                    </div>
                </div>
            </div>

            {/* Scope selector modal */}
            {showScopeSelector && currentUser && (
                <CollectionAIScopeSelector
                    userId={currentUser.uid}
                    initialScope={scopeSelection ?? undefined}
                    onApply={setScopeSelection}
                    onClose={() => setShowScopeSelector(false)}
                />
            )}
        </div>
    );
}
