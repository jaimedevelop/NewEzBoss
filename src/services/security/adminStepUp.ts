import { betterAuthEnabled, COOKIE_SESSION_HANDLE, cookieSessionBinding } from '../authMode';
import { authRequest, getCookieSessionHandle } from '../authClient';
import { startAuthentication } from '@simplewebauthn/browser';
import { getAuth0Client } from '../apiAuth';

type Presenter = (action: () => Promise<string>) => Promise<string>;
let presenter: Presenter | undefined;
let pending: Promise<string> | undefined;
export function installAdminStepUpPresenter(value: Presenter): () => void {
  presenter = value;
  return () => { if (presenter === value) presenter = undefined; };
}
async function freshAdminToken(expected?:{subject:string;sessionId:string}): Promise<string> {
  if(betterAuthEnabled) {
    const original=await authRequest('/get-session');
    if(expected && (original?.user?.id!==expected.subject || original?.session?.id!==expected.sessionId))throw new Error('Account changed during verification. The action was not retried.');
    if(!original?.session?.id || !presenter)throw new Error('Administrator verification is unavailable. Please sign in again.');
    return presenter(async()=>{
      const challenge=await authRequest('/ezboss/admin/challenge',{});
      const response=await startAuthentication({optionsJSON:challenge.options});
      await authRequest('/ezboss/admin/verify',{transactionId:challenge.transactionId,response});
      const current=await authRequest('/get-session');
      if(current?.user?.id!==original.user.id || current?.session?.id!==original.session.id)throw new Error('Account changed during verification. The action was not retried.');
      return getCookieSessionHandle(original.user.id,original.session.id);
    });
  }
  const sdk = getAuth0Client();
  const subject = (await sdk.getUser())?.sub;
  if (!subject || !presenter) throw new Error('Administrator verification is unavailable. Please sign in again.');
  return presenter(async () => {
    // Called directly by the dialog button so the browser permits the popup.
    const token = await sdk.getTokenWithPopup({ authorizationParams: { max_age: 0, prompt: 'login', acr_values: 'urn:ezboss:phishing-resistant-mfa' } }, { timeoutInSeconds: 90 });
    if ((await sdk.getUser())?.sub !== subject) throw new Error('Account changed during verification. The action was not retried.');
    if (!token) throw new Error('Administrator authentication returned no access token. Please sign in again.');
    return token;
  });
}
/** Retry only the explicit pre-action assurance denial, once. Bodies stay in memory. */
export async function adminFetch(url: string, init: RequestInit = {}, fetcher: typeof fetch = fetch): Promise<Response> {
  const first = await fetcher(url, init);
  if (first.status !== 403 || (await first.clone().json().catch(() => ({}))).code !== 'ADMIN_STEP_UP_REQUIRED') return first;
  const authorization=new Headers(init.headers).get('Authorization')||'';
  const expected=betterAuthEnabled && authorization.startsWith(`Bearer ${COOKIE_SESSION_HANDLE}:`)?cookieSessionBinding(authorization.slice(7)):undefined;
  if (!pending) pending = freshAdminToken(expected).finally(() => { pending = undefined; });
  const token = await pending;
  const headers = new Headers(init.headers); headers.set('Authorization', `Bearer ${token}`);
  return fetcher(url, { ...init, headers });
}

/** Display known failures without exposing provider responses or token contents. */
export function adminVerificationMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'error' in error ? String(error.error) : '';
  if (code === 'popup_closed') return 'The verification window was closed. The action was not retried.';
  if (code === 'timeout') return 'Administrator verification timed out. Please try again.';
  if (code === 'popup_open_error') return 'The browser blocked the verification window. Allow popups for EzBoss and try again.';
  if (code === 'login_required' || code === 'missing_refresh_token' || code === 'invalid_grant') return 'Your authentication session could not be verified. Sign out, sign in again, and retry.';
  if (code === 'access_denied' || code === 'unauthorized') return 'Auth0 denied administrator verification. Check the administrator MFA policy and application configuration.';
  if (error instanceof Error && [
    'Account changed during verification. The action was not retried.',
    'Administrator authentication returned no access token. Please sign in again.',
  ].includes(error.message)) return error.message;
  if(betterAuthEnabled)return 'Security verification was cancelled or could not finish. Use your enrolled passkey and retry.';
  return 'Administrator verification failed. Check the Auth0 authentication logs for this sign-in, then retry.';
}
