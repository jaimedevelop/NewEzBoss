import { getAuth0Client } from '../apiAuth';

type Presenter = (action: () => Promise<string>) => Promise<string>;
let presenter: Presenter | undefined;
let pending: Promise<string> | undefined;
export function installAdminStepUpPresenter(value: Presenter): () => void {
  presenter = value;
  return () => { if (presenter === value) presenter = undefined; };
}
async function freshAdminToken(): Promise<string> {
  const sdk = getAuth0Client();
  const subject = (await sdk.getUser())?.sub;
  if (!subject || !presenter) throw new Error('Administrator verification is unavailable. Please sign in again.');
  return presenter(async () => {
    // Called directly by the dialog button so the browser permits the popup.
    await sdk.loginWithPopup({ authorizationParams: { max_age: 0, prompt: 'login', acr_values: 'urn:ezboss:phishing-resistant-mfa' } }, { timeoutInSeconds: 90 });
    if ((await sdk.getUser())?.sub !== subject) throw new Error('Account changed during verification. The action was not retried.');
    return sdk.getTokenSilently({ cacheMode: 'off' });
  });
}
/** Retry only the explicit pre-action assurance denial, once. Bodies stay in memory. */
export async function adminFetch(url: string, init: RequestInit = {}, fetcher: typeof fetch = fetch): Promise<Response> {
  const first = await fetcher(url, init);
  if (first.status !== 403 || (await first.clone().json().catch(() => ({}))).code !== 'ADMIN_STEP_UP_REQUIRED') return first;
  if (!pending) pending = freshAdminToken().finally(() => { pending = undefined; });
  const token = await pending;
  const headers = new Headers(init.headers); headers.set('Authorization', `Bearer ${token}`);
  return fetcher(url, { ...init, headers });
}
