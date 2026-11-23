import type { AISettings } from './collections.ai.types';

export function loadAICredentials(storageKey: string | undefined): AISettings['apiKeys'] {
    if (!storageKey) return {};
    try {
        const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}');
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
        return Object.fromEntries(Object.entries(saved).filter(([, value]) => typeof value === 'string'));
    } catch {
        return {};
    }
}

export function saveAICredentials(storageKey: string | undefined, keys: AISettings['apiKeys']): void {
    if (!storageKey) return;
    try {
        const entries = Object.entries(keys).filter(([, value]) => value?.trim());
        if (entries.length) sessionStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(entries)));
        else sessionStorage.removeItem(storageKey);
    } catch {
        // The current page can still use the key when browser storage is unavailable.
    }
}
