// Apply the explicit company context consistently to API fetch callers.
let membership: string | null = null;
let generation = 0;
let installed = false;
export function companyCacheScope() { return `${membership ?? "unselected"}:${generation}`; }
export function setCompanySession(id: string | null) { membership = id; ++generation; }
export function installCompanySession() {
  if (installed) return;
  installed = true;
  const original = window.fetch.bind(window);
  const api = `${import.meta.env.VITE_API_URL}`.replace(/\/$/, '');
  window.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!(url === api || url.startsWith(`${api}/`))) return original(input, init);
    const version = generation;
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (membership) headers.set('X-Company-Membership-Id', membership);
    const response = await original(input, {...init, headers});
    if (version !== generation) throw new DOMException('Company session changed', 'AbortError');
    if (response.status === 403 && !url.includes('/account/me')) window.dispatchEvent(new Event('ezboss:permission-denied'));
    return response;
  };
}
