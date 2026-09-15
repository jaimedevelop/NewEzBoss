import { getProducts } from '../../inventory/products';
import { getLaborItems } from '../../inventory/labor';
import { getTools } from '../../inventory/tools';
import { getEquipment } from '../../inventory/equipment';
import {
    AISettings,
    AIInventoryContext,
    AICollectionResult,
    AIInventoryItem,
    AILaborItem,
    AIToolItem,
    AIEquipmentItem,
} from './collections.ai.types';
import { builtInModels, credentialFor, generateText, modelIdentity, providerIdFor } from './collections.ai.adapters';

// ---------------------------------------------------------------------------
// Available models
// ---------------------------------------------------------------------------

export const AI_MODELS = builtInModels();

export const DEFAULT_AI_SETTINGS: AISettings = {
    provider: 'anthropic',
    modelId: modelIdentity('anthropic', 'claude-sonnet-4-6'),
    apiKey: '',
    apiKeys: {},
    customProviders: [],
    customModels: [],
};

const SETTINGS_KEY = 'collection_ai_settings';

export function loadAISettings(userId?: string): AISettings {
    try {
        const raw = localStorage.getItem(userId ? `${SETTINGS_KEY}:${userId}` : SETTINGS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            const settings: AISettings = {
                ...DEFAULT_AI_SETTINGS,
                ...parsed,
                apiKeys: parsed.apiKeys ?? {},
                customProviders: parsed.customProviders ?? [],
                customModels: parsed.customModels ?? [],
            };
            const providerId = providerIdFor(settings.provider, settings.activeCustomProviderId);
            const legacyRaw = settings.modelId;
            if (legacyRaw && !legacyRaw.startsWith(`${providerId}:`)) settings.modelId = modelIdentity(providerId, legacyRaw);
            settings.apiKeys = Object.fromEntries(Object.entries(settings.apiKeys).map(([id, key]) => [id.startsWith('custom:') || ['anthropic','openai','google','deepseek'].includes(id) ? id : `custom:${id}`, typeof key === 'string' ? key.trim() : '']));
            settings.apiKey = credentialFor(settings);
            return settings;
        }
    } catch { }
    return { ...DEFAULT_AI_SETTINGS };
}

export function saveAISettings(s: AISettings, userId?: string): void {
    localStorage.setItem(userId ? `${SETTINGS_KEY}:${userId}` : SETTINGS_KEY, JSON.stringify(s));
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
    const failed = [pr, lr, tr, er].find((r: any) => r?.success === false);
    if (failed) throw new Error((failed as any).error || 'Unable to load inventory.');

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

    let filtered = hint
        ? items.filter(item => {
            const t = ((item[tradeField] as unknown) as string || '').toLowerCase();
            return t.includes(hint) || hint.includes(t);
        })
        : items;

    if (filtered.length === 0) filtered = items;

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

function csvEscape(v: unknown): string {
    return String(v ?? '').replace(/,/g, ';').replace(/\n/g, ' ');
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

function parseJson(raw: string): unknown { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }

function stage1(value: unknown, prompt: string): Stage1Result {
    if (!value || typeof value !== 'object') return { trade: '', keywords: extractKeywords(prompt) };
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.trade !== 'string' || !Array.isArray(candidate.keywords) || !candidate.keywords.every(k => typeof k === 'string')) return { trade: '', keywords: extractKeywords(prompt) };
    return { trade: candidate.trade.trim(), keywords: candidate.keywords.map(k => k.trim()).filter(Boolean).slice(0, 20) };
}

async function runStage1(prompt: string, settings: AISettings, signal?: AbortSignal): Promise<Stage1Result> {
    const raw = await generateText(settings, prompt, STAGE1_SYSTEM, 256, signal);
    try {
        return stage1(parseJson(raw), prompt);
    } catch {
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

function validatedSelection(value: unknown, allowed: Set<string>, label: string) {
    if (!Array.isArray(value)) throw new Error(`AI returned an invalid ${label} list.`);
    const seen = new Set<string>();
    return value.map((item: any) => {
        if (!item || typeof item.id !== 'string' || !allowed.has(item.id) || seen.has(item.id) || !Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error(`AI returned an invalid ${label} selection.`);
        seen.add(item.id); return { id: item.id, quantity: item.quantity, ...(typeof item.reason === 'string' ? { reason: item.reason } : {}) };
    });
}
function validateCollection(value: unknown, context: AIInventoryContext): AICollectionResult {
    if (!value || typeof value !== 'object') throw new Error('The AI returned an invalid response.');
    const v = value as Record<string, any>;
    if (typeof v.name !== 'string' || !v.name.trim() || typeof v.description !== 'string' || typeof v.trade !== 'string') throw new Error('The AI response is missing collection details.');
    return { name: v.name.trim(), description: v.description.trim(), trade: v.trade.trim(), selectedProducts: validatedSelection(v.selectedProducts, new Set(context.products.map(x => x.id)), 'product'), selectedLabor: validatedSelection(v.selectedLabor, new Set(context.labor.map(x => x.id)), 'labor'), selectedTools: validatedSelection(v.selectedTools, new Set(context.tools.map(x => x.id)), 'tool'), selectedEquipment: validatedSelection(v.selectedEquipment, new Set(context.equipment.map(x => x.id)), 'equipment') };
}

export async function generateCollectionFromPrompt(
    userPrompt: string,
    context: AIInventoryContext,
    settings: AISettings,
    onStageChange?: (stage: 'classifying' | 'generating') => void,
    signal?: AbortSignal,
): Promise<AICollectionResult> {
    onStageChange?.('classifying');
    const { trade, keywords: aiKeywords } = await runStage1(userPrompt, settings, signal);

    const localKeywords = extractKeywords(userPrompt);
    const keywords = Array.from(new Set([...aiKeywords, ...localKeywords]));

    const filteredCtx = {
        products: filterAndCap(context.products, keywords, trade, 'trade'),
        labor: filterAndCap(context.labor, keywords, trade, 'trade'),
        tools: filterAndCap(context.tools, keywords, trade, 'tradeName'),
        equipment: filterAndCap(context.equipment, keywords, trade, 'tradeName'),
    };

    onStageChange?.('generating');
    const system = buildStage2System(filteredCtx);
    const raw = await generateText(settings, userPrompt, system, 2048, signal);

    const cleaned = raw.replace(/```json|```/g, '').trim();
    try {
        return validateCollection(parseJson(cleaned), filteredCtx);
    } catch {
        throw new Error('The AI returned an invalid response. Please try again.');
    }
}

export async function verifyAPIKey(settings: AISettings): Promise<{ success: boolean; error?: string }> {
    try {
        const output = await generateText(settings, 'Reply with: {"test":true}', 'Reply only with the exact JSON object requested.', 64);
        if (!output.includes('test')) throw new Error('Provider returned no verifiable output.');
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
