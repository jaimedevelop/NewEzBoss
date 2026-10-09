const SEARCH_KEY_PREFIX = 'ezboss:estimates:search:';

export const estimateSearchSessionKey = (userId: string) => `${SEARCH_KEY_PREFIX}${userId}`;

export function readEstimateSearchSession(key: string): string {
  try {
    return sessionStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

export function writeEstimateSearchSession(key: string, value: string): void {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    // Search remains usable when browser storage is unavailable.
  }
}

export function clearEstimateSearchSession(): void {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(SEARCH_KEY_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // Browser storage may be disabled.
  }
}
