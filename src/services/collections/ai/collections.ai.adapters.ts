import { AIModel, AIProvider, AISettings, CustomProvider } from './collections.ai.types';

export type ProviderId = Exclude<AIProvider, 'custom'> | `custom:${string}`;
export const providerIdFor = (provider: AIProvider, customId?: string): ProviderId =>
    provider === 'custom' ? `custom:${customId ?? ''}` : provider;
export const modelIdentity = (providerId: string, modelId: string) => `${providerId}:${modelId}`;
export const rawModelId = (model: AIModel | undefined, savedId: string) => model?.modelId ?? (savedId.slice(savedId.indexOf(':') + 1) || savedId);

export function normalizedCustomEndpoint(value: string): string {
    let url: URL;
    try { url = new URL(value.trim()); } catch { throw new Error('Enter a valid HTTPS API endpoint URL.'); }
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        throw new Error('Custom API endpoints must use HTTPS (except localhost).');
    }
    url.hash = ''; url.search = '';
    return url.toString().replace(/\/$/, '');
}

export function credentialFor(settings: AISettings): string {
    const id = providerIdFor(settings.provider, settings.activeCustomProviderId);
    // Legacy custom keys used raw custom IDs; accept only that provider's old key.
    return (settings.apiKeys[id] ?? (settings.provider === 'custom' && settings.activeCustomProviderId ? settings.apiKeys[settings.activeCustomProviderId] : '') ?? '').trim();
}

const BUILTIN: Record<Exclude<AIProvider, 'custom'>, Array<[string, string]>> = {
    anthropic: [['claude-sonnet-4-6', 'Claude Sonnet 4.6'], ['claude-opus-4-6', 'Claude Opus 4.6']],
    openai: [['gpt-4o', 'GPT-4o'], ['gpt-4o-mini', 'GPT-4o Mini']],
    google: [['gemini-2.0-flash', 'Gemini 2.0 Flash'], ['gemini-2.5-pro', 'Gemini 2.5 Pro']],
    deepseek: [['deepseek-chat', 'DeepSeek V3'], ['deepseek-reasoner', 'DeepSeek R1']],
};
export const builtInModels = (): AIModel[] => Object.entries(BUILTIN).flatMap(([provider, rows]) => rows.map(([modelId, name]) => ({ id: modelIdentity(provider, modelId), modelId, name, provider: provider as Exclude<AIProvider, 'custom'>, contextWindow: 0, source: 'built-in', capability: 'supported' })));

type Fetcher = typeof fetch;
const textFrom = (data: any): string => {
    const parts = data?.content ?? data?.candidates?.[0]?.content?.parts ?? [];
    return (Array.isArray(parts) ? parts : []).map((p: any) => typeof p?.text === 'string' ? p.text : '').join('').trim() || String(data?.choices?.[0]?.message?.content ?? '').trim();
};
const errorFrom = (data: any, status: number) => data?.error?.message || data?.message || `Provider returned ${status}`;

export async function discoverModels(providerId: ProviderId, key: string, custom?: CustomProvider, signal?: AbortSignal, fetcher: Fetcher = fetch): Promise<AIModel[]> {
    if (!key.trim()) throw new Error('Add this provider\'s API key before refreshing models.');
    const models: AIModel[] = [];
    const add = (raw: string, name = raw, capability: AIModel['capability'] = 'unknown') => raw && models.push({ id: modelIdentity(providerId, raw), modelId: raw, name, provider: providerId.startsWith('custom:') ? 'custom' : providerId as AIProvider, customProviderId: custom?.id, contextWindow: 0, source: 'discovered', capability });
    if (providerId === 'anthropic') {
        let after = ''; do { const r = await fetcher(`/proxy/anthropic/v1/models${after ? `?after_id=${encodeURIComponent(after)}` : ''}`, { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, signal }); const d = await r.json(); if (!r.ok) throw new Error(errorFrom(d, r.status)); (d.data ?? []).forEach((m: any) => add(m.id, m.display_name ?? m.id)); after = d.has_more ? d.last_id : ''; } while (after);
    } else if (providerId === 'google') {
        let token = ''; do { const r = await fetcher(`/proxy/google/v1beta/models${token ? `?pageToken=${encodeURIComponent(token)}` : ''}`, { headers: { 'x-goog-api-key': key }, signal }); const d = await r.json(); if (!r.ok) throw new Error(errorFrom(d, r.status)); (d.models ?? []).filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent')).forEach((m: any) => add(String(m.name ?? '').replace(/^models\//, ''), m.displayName ?? m.name, 'supported')); token = d.nextPageToken ?? ''; } while (token);
    } else {
        const endpoint = providerId === 'openai' ? '/proxy/openai/v1/models' : providerId === 'deepseek' ? '/proxy/deepseek/models' : `${normalizedCustomEndpoint(custom!.baseUrl).replace(/\/chat\/completions$/i, '')}/models`;
        const r = await fetcher(endpoint, { headers: { Authorization: `Bearer ${key}` }, signal }); const d = await r.json(); if (!r.ok) throw new Error(errorFrom(d, r.status)); (Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : []).forEach((m: any) => add(m.id, m.name ?? m.id));
    }
    return Array.from(new Map(models.map(m => [m.id, m])).values());
}

export async function generateText(settings: AISettings, prompt: string, system: string, maxTokens: number, signal?: AbortSignal, fetcher: Fetcher = fetch): Promise<string> {
    const key = credentialFor(settings); if (!key) throw new Error('Add an API key for the selected provider.');
    const providerId = providerIdFor(settings.provider, settings.activeCustomProviderId);
    const model = [...builtInModels(), ...settings.customModels].find(m => m.id === settings.modelId);
    const modelId = rawModelId(model, settings.modelId); let url: string; let init: RequestInit;
    if (providerId === 'anthropic') { url = '/proxy/anthropic/v1/messages'; init = { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: modelId, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] }), signal }; }
    else if (providerId === 'google') { url = `/proxy/google/v1beta/models/${encodeURIComponent(modelId)}:generateContent`; init = { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens } }), signal }; }
    else { const custom = settings.customProviders.find(p => p.id === settings.activeCustomProviderId); url = providerId === 'openai' ? '/proxy/openai/v1/chat/completions' : providerId === 'deepseek' ? '/proxy/deepseek/chat/completions' : `${normalizedCustomEndpoint(custom?.baseUrl ?? '')}${/\/chat\/completions$/i.test(custom?.baseUrl ?? '') ? '' : '/chat/completions'}`; init = { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: modelId, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }), signal }; }
    const res = await fetcher(url, init); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(errorFrom(data, res.status));
    if (data?.stop_reason === 'max_tokens' || data?.choices?.[0]?.finish_reason === 'length') throw new Error('The AI response was truncated. Please try a smaller request.');
    if (data?.candidates?.[0]?.finishReason && !['STOP'].includes(data.candidates[0].finishReason)) throw new Error(`The AI did not complete the request (${data.candidates[0].finishReason}).`);
    const text = textFrom(data); if (!text) throw new Error('The AI returned no usable text.'); return text;
}
