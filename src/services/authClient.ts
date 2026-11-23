import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
import { createCookieSessionHandle, cookieSignOutBarrier, identityEpoch } from './authMode';
import { safeAuthReturnTo } from './authRedirect';
const makeClient=()=>createAuthClient({baseURL:window.location.origin,
  plugins:[twoFactorClient(),passkeyClient()],fetchOptions:{credentials:'include'}});
let activeClient:ReturnType<typeof makeClient>|undefined;
export const authClient=new Proxy({} as ReturnType<typeof makeClient>,{get(_target,key){activeClient??=makeClient();return Reflect.get(activeClient,key);}});
export async function authRequest(path:string,body?:object) {
  let response: Response;
  try {
    response=await fetch(`/api/auth${path}`,{method:body?'POST':'GET',credentials:'include',cache:'no-store',
      signal:AbortSignal.timeout(15000),
      headers:{...(body?{'Content-Type':'application/json'}:{}),'X-EzBoss-CSRF':'1'},body:body?JSON.stringify(body):undefined});
  } catch {
    throw new Error('Could not reach EzBoss authentication. Check your connection and try again.');
  }
  const data=await response.json().catch(()=>undefined);
  const requestId=response.headers.get('X-EzBoss-Request-Id');
  if(response.status===429){
    const seconds=Number(response.headers.get('Retry-After') ?? response.headers.get('X-Retry-After'));
    const message=Number.isSafeInteger(seconds) && seconds>0
      ? `Too many attempts. Try again in ${seconds} ${seconds===1?'second':'seconds'}.`
      : 'Too many attempts. Wait a moment and try again.';
    throw Object.assign(new Error(message),{
      status:response.status,code:data?.code,requestId,
      retryAfterSeconds:Number.isSafeInteger(seconds) && seconds > 0 ? seconds : undefined,
    });
  }
  if(response.status>=500)throw Object.assign(new Error('EzBoss authentication is temporarily unavailable. Try again.'),{status:response.status,requestId});
  if(!response.ok)throw Object.assign(new Error(data?.code==='TOTP_REPLAYED'?'Wait for a new authenticator code and try again.':response.status===401?'Sign in again to continue.':'Unable to complete authentication. Please try again.'),{status:response.status,code:data?.code});
  return data;
}
type CookieSession = NonNullable<Awaited<ReturnType<typeof authClient.getSession>>['data']>;
let sessionRead: { epoch: string; promise: Promise<CookieSession | null> } | undefined;
let sessionRateLimit: { until: number; error: Error } | undefined;
export function cookieSessionRetryDelay() {
  return Math.max(0, (sessionRateLimit?.until ?? 0) - Date.now());
}
// Reuse only the binding used to label routine API requests. The API still
// validates the live cookie and requires it to match both IDs on every request.
const bindingReuseMs = 10_000;
let recentBinding: { epoch: string; until: number; subject: string; sessionId: string } | undefined;
export function readCookieSession(): Promise<CookieSession | null> {
  const epoch = identityEpoch();
  if (sessionRead?.epoch === epoch) return sessionRead.promise;
  if (sessionRateLimit && cookieSessionRetryDelay() > 0) {
    return Promise.reject(sessionRateLimit.error);
  }
  const promise = (async () => {
    const data = await authRequest('/get-session');
    if (data === null) {
      if (epoch === identityEpoch()) recentBinding = undefined;
      return null;
    }
    if (typeof data?.user?.id === 'string' && data.user.id &&
        typeof data?.session?.id === 'string' && data.session.id) {
      if (epoch === identityEpoch()) {
        recentBinding = { epoch, until: Date.now() + bindingReuseMs, subject: data.user.id, sessionId: data.session.id };
      }
      return data;
    }
    throw new Error('EzBoss received an invalid session response. Try again.');
  })().catch((error: unknown) => {
    const failure = error as (Error & { status?: number; retryAfterSeconds?: number }) | null;
    if (failure?.status === 429) {
      sessionRateLimit = { until: Date.now() + (failure.retryAfterSeconds ?? 60) * 1000, error: failure };
    }
    throw error;
  }).finally(() => {
    if (sessionRead?.promise === promise) sessionRead = undefined;
  });
  sessionRead = { epoch, promise };
  return promise;
}
export function authReturnTo() {
  const requested=new URLSearchParams(window.location.search).get('returnTo');
  return safeAuthReturnTo(requested,window.location.origin,'/');
}
export function openAuthPage(signup=false,returnTo=window.location.pathname+window.location.search) {
  const safe=safeAuthReturnTo(returnTo,window.location.origin,'/');
  window.location.assign(`/landing/${signup?'signup':'login'}?returnTo=${encodeURIComponent(safe)}`);
}
let expectedIdentity:string|undefined;
let expectedSession:string|undefined;
export function setExpectedCookieIdentity(subject:string|undefined,sessionId?:string){expectedIdentity=subject;expectedSession=sessionId;}
export async function getCookieSessionHandle(expected=expectedIdentity,sessionId=expectedSession, { fresh = false } = {}):Promise<string> {
  if(cookieSignOutBarrier())throw Object.assign(new Error('Sign in again to continue.'),{error:'login_required'});
  const epoch = identityEpoch();
  const binding = recentBinding;
  if (!fresh && binding?.epoch === epoch && Date.now() < binding.until &&
      (!expected || expected === binding.subject) && (!sessionId || sessionId === binding.sessionId)) {
    return createCookieSessionHandle(binding.subject, binding.sessionId);
  }
  let session: CookieSession | null;
  try {
    session = await readCookieSession();
  } catch (error) {
    const currentBinding = recentBinding;
    // A rate-limited session lookup does not invalidate the last verified
    // binding. The API still verifies the live cookie before returning data.
    if (!fresh && error === sessionRateLimit?.error && cookieSessionRetryDelay() > 0 && !cookieSignOutBarrier() &&
        epoch === identityEpoch() && currentBinding?.epoch === epoch &&
        expected === currentBinding.subject && sessionId === currentBinding.sessionId) {
      return createCookieSessionHandle(currentBinding.subject, currentBinding.sessionId);
    }
    throw error;
  }
  if (cookieSignOutBarrier() || epoch !== identityEpoch()) throw new DOMException('Account session changed', 'AbortError');
  if(!session?.user?.id || !session?.session?.id)throw Object.assign(new Error('Your session expired. Please sign in again.'),{error:'login_required'});
  if((expected && session.user.id!==expected) || (sessionId && session.session.id!==sessionId)){recentBinding=undefined;window.dispatchEvent(new Event('ezboss:cookie-identity'));throw Object.assign(new Error('Account changed. Retry after authentication finishes.'),{error:'session_changed'});}
  return createCookieSessionHandle(session.user.id,session.session.id);
}
export const cookieIdentityClient={
  getUser:async()=>{const session=await readCookieSession();return session?.user?{...session.user,sub:session.user.id}:undefined;},
};
