/** Auth0 appState may restore an application route, never an external URL. */
export function safeAuthReturnTo(value: unknown, origin: string, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  try {
    const url = new URL(value, origin);
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch { return fallback; }
}
