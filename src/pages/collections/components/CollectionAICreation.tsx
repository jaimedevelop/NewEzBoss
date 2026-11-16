import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../../contexts/AuthContext';
import BusinessActionButton from '../../../mainComponents/ui/BusinessActionButton';
import { collectionsApiRequest, errorMessage } from '../../../services/collections/collectionsApi';

const providers = {
    anthropic: { label: 'Anthropic', model: 'claude-sonnet-4-6' },
    openai: { label: 'OpenAI', model: 'gpt-4o' },
    google: { label: 'Google', model: 'gemini-2.5-pro' },
    deepseek: { label: 'DeepSeek', model: 'deepseek-chat' },
};
type Provider = keyof typeof providers;
type Selection = { contentType: 'products' | 'labor' | 'tools' | 'equipment'; itemId: number; quantity: number };
type Proposal = { name: string; description: string; items: Selection[] };
type Generated = { collection: Proposal; preview: (Selection & { name: string })[] };
const permissions = ['read:collections', 'write:collections', 'read:inventory'];
const field = 'w-full rounded-lg border border-gray-300 p-2 disabled:bg-gray-100';

// Remount on account/company changes so credentials and pending work do not
// carry over. All provider traffic uses the authenticated API, never the relay.
export default function CollectionAICreation() {
    const { currentUser, membershipId } = useAuthContext();
    return <CollectionAIForm key={`${currentUser?.uid}:${membershipId}`} />;
}

function CollectionAIForm() {
    const { canPerform } = useAuthContext();
    const navigate = useNavigate();
    const [provider, setProvider] = useState<Provider>('anthropic');
    const [model, setModel] = useState(providers.anthropic.model);
    const [apiKey, setApiKey] = useState('');
    const [prompt, setPrompt] = useState('');
    const [generated, setGenerated] = useState<Generated | null>(null);
    const [busy, setBusy] = useState<'generate' | 'save' | null>(null);
    const [error, setError] = useState('');
    const controller = useRef<AbortController | null>(null);
    const saveRequest = useRef<{ content: string; id: string } | null>(null);
    // A failed save may have committed. Freeze its content until the same
    // idempotent request confirms the result, avoiding duplicate collections.
    const [saveUnconfirmed, setSaveUnconfirmed] = useState(false);
    const allowed = permissions.every(canPerform);
    useEffect(() => () => { controller.current?.abort(); }, []);

    async function generate() {
        if (!allowed || busy || saveUnconfirmed || !prompt.trim() || !apiKey.trim() || !model.trim()) return;
        const request = new AbortController();
        controller.current = request;
        setBusy('generate'); setError('');
        try {
            const result = await collectionsApiRequest<Generated>('/native-collection-ai/generate', {
                method: 'POST', signal: request.signal, headers: { 'x-ai-key': apiKey.trim() },
                body: JSON.stringify({ provider, model: model.trim(), prompt: prompt.trim() }),
            });
            if (request.signal.aborted) return;
            setGenerated(result); saveRequest.current = null;
        } catch (cause) {
            if (!request.signal.aborted) setError(errorMessage(cause, 'Generation failed. Your prompt is preserved; please retry.'));
        } finally { if (!request.signal.aborted) setBusy(null); }
    }

    async function save() {
        if (!allowed || busy || !generated?.collection.name.trim()) return;
        const content = JSON.stringify(generated.collection);
        if (saveRequest.current?.content !== content) saveRequest.current = { content, id: crypto.randomUUID() };
        const request = new AbortController();
        controller.current = request;
        setBusy('save'); setError(''); setSaveUnconfirmed(true);
        try {
            const result = await collectionsApiRequest<{ id: number }>('/native-collection-ai/save', {
                method: 'POST', signal: request.signal,
                body: JSON.stringify({ requestId: saveRequest.current.id, collection: generated.collection }),
            });
            if (!request.signal.aborted) navigate(`/collections/${result.id}`);
        } catch (cause) {
            if (!request.signal.aborted) setError(`${errorMessage(cause, 'Save was not confirmed.')} Retry saving to confirm the same collection.`);
        } finally { if (!request.signal.aborted) setBusy(null); }
    }

    const locked = !!busy || saveUnconfirmed;
    return (
        <section className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            <Link to="/collections/create" className="text-orange-700 hover:underline">Back to collection options</Link>
            <div>
                <h1 className="text-2xl font-semibold">AI Collection Creator</h1>
                <p className="mt-2 text-gray-600">Describe a job, review the suggested inventory, then save your collection.</p>
            </div>
            {!allowed && <p role="alert">Your company permissions do not allow AI collection creation. You need collection read/write and inventory read access.</p>}
            <form onSubmit={event => { event.preventDefault(); void generate(); }} className="space-y-4 rounded-xl border bg-white p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block space-y-1">Provider
                        <select className={field} value={provider} disabled={locked} onChange={event => {
                            const next = event.target.value as Provider;
                            setProvider(next); setModel(providers[next].model); setApiKey('');
                        }}>
                            {Object.entries(providers).map(([id, value]) => <option key={id} value={id}>{value.label}</option>)}
                        </select>
                    </label>
                    <label className="block space-y-1">Model
                        <input className={field} value={model} maxLength={200} required disabled={locked} onChange={event => setModel(event.target.value)} />
                    </label>
                </div>
                <label className="block space-y-1">Provider API key
                    <input className={field} type="password" autoComplete="off" value={apiKey} maxLength={4096} required disabled={locked} onChange={event => setApiKey(event.target.value)} />
                </label>
                <p className="text-sm text-gray-600">Your key is used for this session only and sent through the authenticated API to your selected provider. Your provider may charge for generation. Relevant inventory is included in the request.</p>
                <label className="block space-y-1">Describe your job
                    <textarea className={field} rows={4} value={prompt} maxLength={4000} required disabled={locked} onChange={event => setPrompt(event.target.value)} placeholder="For example, a toilet installation" />
                </label>
                <BusinessActionButton type="submit" capability="write:collections" requires={['read:collections', 'read:inventory']}
                    disabled={locked || !apiKey.trim() || !model.trim() || !prompt.trim()} className="rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50">
                    {busy === 'generate' ? 'Generating…' : generated ? 'Generate again' : 'Generate collection'}
                </BusinessActionButton>
                {busy === 'generate' && <button type="button" className="ml-4 underline" onClick={() => { controller.current?.abort(); setBusy(null); }}>Cancel</button>}
            </form>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
            {generated && <div className="space-y-4 rounded-xl border bg-white p-4">
                <h2 className="text-lg font-semibold">Review collection</h2>
                <p className="text-sm text-gray-600">Check the suggested items and quantities before saving. Prices come from your current inventory.</p>
                <label className="block space-y-1">Collection name
                    <input className={field} value={generated.collection.name} maxLength={200} disabled={locked} onChange={event => setGenerated({ ...generated, collection: { ...generated.collection, name: event.target.value } })} />
                </label>
                <label className="block space-y-1">Description
                    <textarea className={field} value={generated.collection.description} maxLength={5000} disabled={locked} onChange={event => setGenerated({ ...generated, collection: { ...generated.collection, description: event.target.value } })} />
                </label>
                {!generated.collection.items.length && <p>No matching inventory items were selected. Revise the job description or save an empty collection.</p>}
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
                <BusinessActionButton capability="write:collections" requires={['read:collections', 'read:inventory']} disabled={!!busy || !generated.collection.name.trim()} onClick={() => void save()}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50">
                    {busy === 'save' ? 'Saving…' : saveUnconfirmed ? 'Retry saving collection' : 'Save reviewed collection'}
                </BusinessActionButton>
            </div>}
        </section>
    );
}
