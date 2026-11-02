// Only these nonsecret preferences survive the upgrade. Credentials and custom
// endpoints (which may contain embedded secrets) must be entered again.
export function aiPreferences(value: unknown): Record<string, unknown> {
  const s = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    provider: ['anthropic', 'openai', 'google', 'deepseek'].includes(String(s.provider)) ? s.provider : 'anthropic',
    modelId: typeof s.modelId === 'string' ? s.modelId.slice(0, 200) : '',
    apiKey: '', apiKeys: {}, customProviders: [], customModels: [],
  };
}
let cleanupFailed = false;
export const browserStorageCleanupFailed = () => cleanupFailed;
export function browserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | undefined {
  try { return globalThis[kind]; } catch { cleanupFailed = true; return undefined; }
}
export function removeBrowserItem(kind: 'localStorage' | 'sessionStorage', key: string): void {
  try { browserStorage(kind)?.removeItem(key); } catch { cleanupFailed = true; }
}
export function migrateBrowserCredentials(storage = browserStorage('localStorage')): void {
  if (!storage) return;
  let keys: string[];
  try { keys = Object.keys(storage); } catch { cleanupFailed = true; return; }
  for (const key of keys) {
    try {
      if (key.startsWith('@@auth0spajs@@') || key === 'ezboss_client_portal_token') storage.removeItem(key);
      if (key === 'collection_ai_settings' || key.startsWith('collection_ai_settings:')) {
        try { storage.setItem(key, JSON.stringify(aiPreferences(JSON.parse(storage.getItem(key) || '{}')))); }
        catch { storage.removeItem(key); }
      }
    } catch { cleanupFailed = true; }
  }
}
/** Destructive cleanup is for explicit identity/company transitions, never cache refresh. */
export function clearAccountBrowserData(): void {
  const storage = browserStorage('localStorage');
  if (!storage) return;
  try {
    for (const key of Object.keys(storage)) {
      if (key.startsWith('ezboss:finance-drafts:') || key.includes('_hierarchy_') || key === 'ezboss_supplier_data') {
        try { storage.removeItem(key); } catch { cleanupFailed = true; }
      }
    }
  } catch { cleanupFailed = true; }
}
/** Same identity on reload retains recovery drafts and the extension handoff. */
export function beginAccountBrowserSession(subject: string): void {
  const storage = browserStorage('localStorage');
  if (!storage) return;
  try {
    const previous = storage.getItem('ezboss:last-account-subject');
    if (previous && previous !== subject) clearAccountBrowserData();
    storage.setItem('ezboss:last-account-subject', subject);
  } catch { cleanupFailed = true; }
}
