import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
import { createCookieSessionHandle, cookieSignOutBarrier } from './authMode';
import { safeAuthReturnTo } from './authRedirect';
const makeClient=()=>createAuthClient({baseURL:window.location.origin,
  plugins:[twoFactorClient(),passkeyClient()],fetchOptions:{credentials:'include'}});
let activeClient:ReturnType<typeof makeClient>|undefined;
export const authClient=new Proxy({} as ReturnType<typeof makeClient>,{get(_target,key){activeClient??=makeClient();return Reflect.get(activeClient,key);}});
export async function authRequest(path:string,body?:object) {
  const response=await fetch(`/api/auth${path}`,{method:body?'POST':'GET',credentials:'include',
    headers:{...(body?{'Content-Type':'application/json'}:{}),'X-EzBoss-CSRF':'1'},body:body?JSON.stringify(body):undefined});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw Object.assign(new Error(data?.code==='TOTP_REPLAYED'?'Wait for a new authenticator code and try again.':response.status===401?'Sign in again to continue.':response.status===429?'Please wait before trying again.':'Unable to complete authentication. Please try again.'),{status:response.status,code:data?.code});
  return data;
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
export async function getCookieSessionHandle(expected=expectedIdentity,sessionId=expectedSession):Promise<string> {
  if(cookieSignOutBarrier())throw Object.assign(new Error('Sign in again to continue.'),{error:'login_required'});
  const session=await authRequest('/get-session');
  if(!session?.user?.id || !session?.session?.id)throw Object.assign(new Error('Your session expired. Please sign in again.'),{error:'login_required'});
  if((expected && session.user.id!==expected) || (sessionId && session.session.id!==sessionId)){window.dispatchEvent(new Event('ezboss:cookie-identity'));throw Object.assign(new Error('Account changed. Retry after authentication finishes.'),{error:'session_changed'});}
  return createCookieSessionHandle(session.user.id,session.session.id);
}
export const cookieIdentityClient={
  getUser:async()=>{const session=await authRequest('/get-session');return session?.user?{...session.user,sub:session.user.id}:undefined;},
};
