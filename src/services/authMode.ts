// Build-time rollout choice. Client flags never grant access; the API validates every credential.
const provider=import.meta.env?.VITE_AUTH_PROVIDER || 'auth0';
if(!['auth0','better-auth'].includes(provider))throw new Error('Unsupported authentication provider');
export const betterAuthEnabled = provider === 'better-auth';
// Compatibility transport handle for existing service signatures, NOT a credential.
// The fetch bridge removes it before network transport. The API must never accept it.
export const COOKIE_SESSION_HANDLE = 'ezboss:cookie-session';
type CookieBinding={subject:string;sessionId:string;epoch:string;createdAt:number};
const cookieHandles=new Map<string,CookieBinding>();
function identityEpoch(){try{return localStorage.getItem('ezboss.cookie.identityEpoch')||'initial';}catch{return 'initial';}}
export function createCookieSessionHandle(subject:string,sessionId:string){
  if(!subject || !sessionId)throw new Error('Authenticated identity required');
  const handle=COOKIE_SESSION_HANDLE+':'+crypto.randomUUID();
  cookieHandles.set(handle,{subject,sessionId,epoch:identityEpoch(),createdAt:Date.now()});
  if(cookieHandles.size>1024)cookieHandles.delete(cookieHandles.keys().next().value!);
  return handle;
}
export function cookieSessionBinding(handle:string){
  const binding=cookieHandles.get(handle);
  if(!binding || cookieSignOutBarrier() || binding.epoch!==identityEpoch() || Date.now()-binding.createdAt>120000)throw new DOMException('Account session changed','AbortError');
  return {...binding};
}
export function installCookieSessionTransport() {
  if (!betterAuthEnabled) return;
  const original=window.fetch.bind(window);
  const api=new URL(String(import.meta.env.VITE_API_URL),window.location.origin);
  const prefix=api.pathname.replace(/\/$/,'');
  if(api.origin!==window.location.origin) throw new Error('Better Auth browser requests require same-origin API routing');
  window.fetch=async(input,init)=>{
    const url=new URL(input instanceof Request?input.url:String(input),window.location.origin);
    const headers=new Headers(init?.headers ?? (input instanceof Request?input.headers:undefined));
    const authorization=headers.get('Authorization')||'';
    if(!authorization.startsWith(`Bearer ${COOKIE_SESSION_HANDLE}:`))return original(input,init);
    const binding=cookieSessionBinding(authorization.slice(7));
    if(url.origin!==api.origin || !(url.pathname===prefix || url.pathname.startsWith(prefix+'/')))throw new Error('Cookie session destination rejected');
    headers.delete('Authorization');headers.set('X-EzBoss-CSRF','1');headers.set('X-EzBoss-Identity',binding.subject);headers.set('X-EzBoss-Session',binding.sessionId);
    return original(input,{...init,headers,credentials:'include'});
  };
}

let localSignOut=false;
const SIGN_OUT_KEY='ezboss.cookie.signedOut';
export function cookieSignOutBarrier() {
  try{return localSignOut || localStorage.getItem(SIGN_OUT_KEY)==='1';}catch{return localSignOut;}
}
export function setCookieSignOutBarrier(value:boolean) {
  localSignOut=value;
  try{if(value)localStorage.setItem(SIGN_OUT_KEY,'1');else localStorage.removeItem(SIGN_OUT_KEY);localStorage.setItem('ezboss.cookie.identityEpoch',crypto.randomUUID());}catch{/* In-memory barrier still blocks the current page. */}
  window.dispatchEvent(new Event('ezboss:cookie-identity'));
}
