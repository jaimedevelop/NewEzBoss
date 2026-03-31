import { getProducts } from '../inventory/products';
import { getLaborItems } from '../inventory/labor';
import { getTools } from '../inventory/tools';
import { getEquipment } from '../inventory/equipment';
import {
    AISettings,
    AIInventoryContext,
    AICollectionResult,
    AIInventoryItem,
    AILaborItem,
    AIToolItem,
    AIEquipmentItem,
} from './collections.ai.types';

// ---------------------------------------------------------------------------
// Available models
// ---------------------------------------------------------------------------

export const AI_MODELS = [
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'anthropic' as const, contextWindow: 200000 },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic' as const, contextWindow: 200000 },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' as const, contextWindow: 128000 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' as const, contextWindow: 128000 },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' as const, contextWindow: 1000000 },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' as const, contextWindow: 1000000 },
    { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek' as const, contextWindow: 64000 },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek' as const, contextWindow: 64000 },
];

export const DEFAULT_AI_SETTINGS: AISettings = {
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-6',
    apiKey: '',
};

const SETTINGS_KEY = 'collection_ai_settings';

export function loadAISettings(): AISettings {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
    } catch { }
    return { ...DEFAULT_AI_SETTINGS };
}

export function saveAISettings(s: AISettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ---------------------------------------------------------------------------
// Inventory loading
// ---------------------------------------------------------------------------

export async function loadInventoryContext(userId: string): Promise<AIInventoryContext> {
    const [pr, lr, tr, er] = await Promise.all([
        getProducts({}),
        getLaborItems(userId, {}),
        getTools(userId),
        getEquipment(userId),
    ]);

    const products: AIInventoryItem[] = (Array.isArray(pr.data) ? pr.data : []).map((p: any) => ({
        id: p.id,
        name: p.name,
        trade: p.trade || '',
        section: p.section || '',
        category: p.category || '',
        subcategory: p.subcategory || '',
        type: p.type || '',
        unitPrice: p.unitPrice ?? p.priceEntries?.[0]?.price ?? 0,
        sku: p.sku || p.skus?.[0]?.sku || '',
    }));

    const rawLabor = Array.isArray(lr.data) ? lr.data : (lr.data as any)?.laborItems ?? [];
    const labor: AILaborItem[] = rawLabor.map((l: any) => ({
        id: l.id,
        name: l.name,
        trade: l.trade || l.tradeName || '',
        section: l.section || l.sectionName || '',
        category: l.category || l.categoryName || '',
        flatRate: l.flatRates?.[0]?.rate,
        hourlyRate: l.hourlyRates?.[0]?.hourlyRate,
    }));

    const tools: AIToolItem[] = (Array.isArray(tr.data) ? tr.data : []).map((t: any) => ({
        id: t.id,
        name: t.name,
        tradeName: t.tradeName || t.trade || '',
        sectionName: t.sectionName || t.section || '',
        categoryName: t.categoryName || t.category || '',
        subcategoryName: t.subcategoryName || t.subcategory || '',
        minimumCustomerCharge: t.minimumCustomerCharge,
    }));

    const equipment: AIEquipmentItem[] = (Array.isArray(er.data) ? er.data : []).map((e: any) => ({
        id: e.id,
        name: e.name,
        tradeName: e.tradeName || e.trade || '',
        sectionName: e.sectionName || e.section || '',
        categoryName: e.categoryName || e.category || '',
        subcategoryName: e.subcategoryName || e.subcategory || '',
        minimumCustomerCharge: e.minimumCustomerCharge,
    }));

    return { products, labor, tools, equipment };
}

// ---------------------------------------------------------------------------
// Optimization 1 — keyword extraction + relevance scoring
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'for', 'of', 'in', 'on', 'at', 'to', 'with', 'is', 'be',
    'i', 'my', 'me', 'we', 'our', 'need', 'want', 'create', 'make', 'build', 'new', 'collection',
]);

function extractKeywords(prompt: string): string[] {
    return prompt
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function relevanceScore(item: { name: string; trade?: string; tradeName?: string; section?: string; sectionName?: string; category?: string; categoryName?: string }, keywords: string[]): number {
    const haystack = [
        item.name,
        item.trade || item.tradeName || '',
        item.section || item.sectionName || '',
        item.category || item.categoryName || '',
    ].join(' ').toLowerCase();

    return keywords.reduce((score, kw) => score + (haystack.includes(kw) ? 1 : 0), 0);
}

// Optimization 2 — hard cap per content type
const MAX_ITEMS_PER_TYPE = 150;

function filterAndCap<T extends object>(
    items: T[],
    keywords: string[],
    tradeHint: string,
    tradeField: keyof T,
): T[] {
    const hint = tradeHint.toLowerCase();

    // If we have a trade hint, keep only matching trade items; otherwise keep all
    let filtered = hint
        ? items.filter(item => {
            const t = ((item[tradeField] as unknown) as string || '').toLowerCase();
            return t.includes(hint) || hint.includes(t);
        })
        : items;

    // If trade filter killed everything (bad hint), fall back to full list
    if (filtered.length === 0) filtered = items;

    // Score and sort by keyword relevance
    const scored = filtered.map(item => ({
        item,
        score: relevanceScore(item as any, keywords),
    }));
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, MAX_ITEMS_PER_TYPE).map(s => s.item);
}

// ---------------------------------------------------------------------------
// Optimization 3 — compressed positional CSV serialization
// ---------------------------------------------------------------------------
// Products:   id,name,trade,section,category,subcategory,unitPrice
// Labor:      id,name,trade,section,category,flatRate
// Tools:      id,name,tradeName,sectionName,categoryName,subcategoryName,charge
// Equipment:  id,name,tradeName,sectionName,categoryName,subcategoryName,charge

function csvEscape(v: unknown): string {
    const s = String(v ?? '').replace(/,/g, ';').replace(/\n/g, ' ');
    return s;
}

function serializeProducts(items: AIInventoryItem[]): string {
    return items
        .map(p => [p.id, p.name, p.trade, p.section, p.category, p.subcategory, p.unitPrice ?? 0].map(csvEscape).join(','))
        .join('\n');
}

function serializeLabor(items: AILaborItem[]): string {
    return items
        .map(l => [l.id, l.name, l.trade, l.section, l.category, l.flatRate ?? l.hourlyRate ?? 0].map(csvEscape).join(','))
        .join('\n');
}

function serializeTools(items: AIToolItem[]): string {
    return items
        .map(t => [t.id, t.name, t.tradeName, t.sectionName, t.categoryName, t.subcategoryName ?? '', t.minimumCustomerCharge ?? 0].map(csvEscape).join(','))
        .join('\n');
}

function serializeEquipment(items: AIEquipmentItem[]): string {
    return items
        .map(e => [e.id, e.name, e.tradeName, e.sectionName, e.categoryName, e.subcategoryName ?? '', e.minimumCustomerCharge ?? 0].map(csvEscape).join(','))
        .join('\n');
}

// ---------------------------------------------------------------------------
// Optimization 4 — two-stage AI call
// Stage 1: Identify trade + relevant category keywords (tiny prompt/response)
// Stage 2: Send only filtered, capped, compressed inventory + get final result
// ---------------------------------------------------------------------------

interface Stage1Result {
    trade: string;
    keywords: string[];
}

const STAGE1_SYSTEM = `You are a construction estimator assistant. The user will describe a job.
Respond ONLY with valid JSON: {"trade":"string","keywords":["word","word",...]}
- trade: the primary construction trade (e.g. Plumbing, Electrical, HVAC, Carpentry)
- keywords: 5-10 lowercase words describing materials, fixtures, or tasks involved
No other text.`;

async function runStage1(
    prompt: string,
    settings: AISettings,
): Promise<Stage1Result> {
    const raw = await callModel(prompt, STAGE1_SYSTEM, settings, 150);
    try {
        const cleaned = raw.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned) as Stage1Result;
    } catch {
        // Graceful fallback — extract keywords locally if stage 1 JSON fails
        return { trade: '', keywords: extractKeywords(prompt) };
    }
}

function buildStage2System(
    ctx: { products: AIInventoryItem[]; labor: AILaborItem[]; tools: AIToolItem[]; equipment: AIEquipmentItem[] },
): string {
    return `You are a construction estimator assistant. Select items from the inventory below to build a collection for the described job.

Respond ONLY with valid JSON:
{
  "name": "string",
  "description": "string",
  "trade": "string",
  "selectedProducts":  [{"id":"string","quantity":number,"reason":"string"}],
  "selectedLabor":     [{"id":"string","quantity":number,"reason":"string"}],
  "selectedTools":     [{"id":"string","quantity":number,"reason":"string"}],
  "selectedEquipment": [{"id":"string","quantity":number,"reason":"string"}]
}

Rules:
- Only use IDs from the lists below (exact match)
- Set realistic quantities for a typical single-job scope
- Leave an array empty if no relevant items exist
- No text outside the JSON object

## PRODUCTS (id,name,trade,section,category,subcategory,unitPrice)
${serializeProducts(ctx.products)}

## LABOR (id,name,trade,section,category,flatRate)
${serializeLabor(ctx.labor)}

## TOOLS (id,name,tradeName,sectionName,categoryName,subcategoryName,charge)
${serializeTools(ctx.tools)}

## EQUIPMENT (id,name,tradeName,sectionName,categoryName,subcategoryName,charge)
${serializeEquipment(ctx.equipment)}`;
}

// ---------------------------------------------------------------------------
// API callers — unified interface
// ---------------------------------------------------------------------------

async function callAnthropic(prompt: string, system: string, apiKey: string, modelId: string, maxTokens: number): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: modelId, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error?.message || `Anthropic ${res.status}`); }
    return (await res.json()).content?.[0]?.text ?? '';
}

async function callOpenAI(prompt: string, system: string, apiKey: string, modelId: string, maxTokens: number): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: modelId, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error?.message || `OpenAI ${res.status}`); }
    return (await res.json()).choices?.[0]?.message?.content ?? '';
}

async function callGoogle(prompt: string, system: string, apiKey: string, modelId: string, maxTokens: number): Promise<string> {
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: system }] },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: maxTokens },
            }),
        },
    );
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error?.message || `Google ${res.status}`); }
    return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callDeepSeek(prompt: string, system: string, apiKey: string, modelId: string, maxTokens: number): Promise<string> {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: modelId, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error?.message || `DeepSeek ${res.status}`); }
    return (await res.json()).choices?.[0]?.message?.content ?? '';
}

async function callModel(prompt: string, system: string, settings: AISettings, maxTokens = 4096): Promise<string> {
    switch (settings.provider) {
        case 'anthropic': return callAnthropic(prompt, system, settings.apiKey, settings.modelId, maxTokens);
        case 'openai': return callOpenAI(prompt, system, settings.apiKey, settings.modelId, maxTokens);
        case 'google': return callGoogle(prompt, system, settings.apiKey, settings.modelId, maxTokens);
        case 'deepseek': return callDeepSeek(prompt, system, settings.apiKey, settings.modelId, maxTokens);
        default: throw new Error('Unsupported AI provider');
    }
}

// ---------------------------------------------------------------------------
// Main export — orchestrates all 4 optimizations
// ---------------------------------------------------------------------------

export async function generateCollectionFromPrompt(
    userPrompt: string,
    context: AIInventoryContext,
    settings: AISettings,
    onStageChange?: (stage: 'classifying' | 'generating') => void,
): Promise<AICollectionResult> {

    // ── Stage 1: classify trade + keywords (tiny call) ──────────────────────
    onStageChange?.('classifying');
    const { trade, keywords: aiKeywords } = await runStage1(userPrompt, settings);

    // Merge AI keywords with locally extracted ones for better coverage
    const localKeywords = extractKeywords(userPrompt);
    const keywords = Array.from(new Set([...aiKeywords, ...localKeywords]));

    // ── Apply optimizations 1 + 2: filter by trade, score by keywords, cap ──
    const filteredCtx = {
        products: filterAndCap(context.products, keywords, trade, 'trade'),
        labor: filterAndCap(context.labor, keywords, trade, 'trade'),
        tools: filterAndCap(context.tools, keywords, trade, 'tradeName'),
        equipment: filterAndCap(context.equipment, keywords, trade, 'tradeName'),
    };

    // ── Stage 2: generate collection from filtered, compressed inventory ─────
    onStageChange?.('generating');
    const system = buildStage2System(filteredCtx);
    const raw = await callModel(userPrompt, system, settings, 2048);

    const cleaned = raw.replace(/```json|```/g, '').trim();
    try {
        return JSON.parse(cleaned) as AICollectionResult;
    } catch {
        throw new Error('The AI returned an invalid response. Please try again.');
    }
}

export async function verifyAPIKey(settings: AISettings): Promise<{ success: boolean; error?: string }> {
    try {
        await callModel('Reply with: {"test":true}', 'Reply only with the exact JSON object requested.', settings, 50);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}