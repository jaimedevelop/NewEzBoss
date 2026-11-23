import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { authRequest, cookieSessionRetryDelay, getCookieSessionHandle, openAuthPage, readCookieSession, setExpectedCookieIdentity } from '../services/authClient';
import { betterAuthEnabled, cookieSignOutBarrier, setCookieSignOutBarrier } from '../services/authMode';

type IdentityFacade = ReturnType<typeof useAuth0> & {
  retryIdentity?: () => Promise<void>;
  signOutError?: Error;
};
type CookieSession = NonNullable<Awaited<ReturnType<typeof readCookieSession>>>;
const BetterIdentityContext = createContext<IdentityFacade | null>(null);

/** One account snapshot for every React and service consumer. Outages retain open
 * work; explicit account changes hide the prior identity until freshly verified. */
export function BetterIdentityProvider({ children }: { children: ReactNode }) {
  const [verified, setVerified] = useState<CookieSession | null>(null);
  const [signedOut, setSignedOut] = useState(cookieSignOutBarrier);
  const [pending, setPending] = useState(true);
  const [sessionError, setSessionError] = useState<Error>();
  const [signOutError, setSignOutError] = useState<Error>();
  const signOutPending = useRef(false);
  const signOutRetryAt = useRef(0);
  const snapshot = useRef<CookieSession | null>(null);
  const generation = useRef(0);
  const refreshing = useRef(false);
  const mounted = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastVerifiedAt = useRef(0);

  const refresh = useCallback(async function refresh(accountChanged: boolean, retry = true) {
    const explicitlySignedOut = cookieSignOutBarrier();
    if (!explicitlySignedOut && !accountChanged && (refreshing.current || (retryTimer.current && cookieSessionRetryDelay() > 0))) return;
    clearTimeout(retryTimer.current);
    retryTimer.current = undefined;
    const run = ++generation.current;
    if (explicitlySignedOut) {
      refreshing.current = false;
      snapshot.current = null;
      setExpectedCookieIdentity(undefined);
      setVerified(null);
      setSessionError(undefined);
      setPending(false);
      return;
    }
    refreshing.current = true;
    if (accountChanged) {
      snapshot.current = null;
      setExpectedCookieIdentity(undefined);
      setVerified(null);
      setPending(true);
    }
    try {
      const session = await readCookieSession();
      if (!mounted.current || run !== generation.current) return;
      snapshot.current = session;
      lastVerifiedAt.current = Date.now();
      setExpectedCookieIdentity(session?.user.id, session?.session.id);
      setVerified(session);
      setSessionError(undefined);
    } catch (error) {
      if (mounted.current && run === generation.current) {
        if (!snapshot.current) {
          setSessionError(error instanceof Error ? error :
            new Error('Authentication temporarily unavailable. Try again.'));
        }
        const delay = cookieSessionRetryDelay();
        if (retry && delay > 0 && !cookieSignOutBarrier()) {
          retryTimer.current = setTimeout(() => {
            retryTimer.current = undefined;
            if (mounted.current && !cookieSignOutBarrier()) void refresh(false, false);
          }, delay);
        }
      }
    } finally {
      if (mounted.current && run === generation.current) {
        refreshing.current = false;
        setPending(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const update = () => {
      const blocked = cookieSignOutBarrier();
      setSignedOut(blocked);
      if (!blocked) setSignOutError(undefined);
      void refresh(true);
    };
    const onResume = () => {
      if (document.visibilityState !== 'visible') return;
      if (!cookieSignOutBarrier() && Date.now() - lastVerifiedAt.current >= 10_000) void refresh(false);
    };
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'ezboss.cookie.identityEpoch' || event.key === 'ezboss.cookie.signedOut') update();
    };
    window.addEventListener('storage', storage);
    window.addEventListener('ezboss:cookie-identity', update);
    window.addEventListener('focus', onResume);
    window.addEventListener('pageshow', onResume);
    window.addEventListener('online', onResume);
    document.addEventListener('visibilitychange', onResume);
    void refresh(false);
    return () => {
      mounted.current = false;
      ++generation.current;
      refreshing.current = false;
      clearTimeout(retryTimer.current);
      retryTimer.current = undefined;
      window.removeEventListener('storage', storage);
      window.removeEventListener('ezboss:cookie-identity', update);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('pageshow', onResume);
      window.removeEventListener('online', onResume);
      document.removeEventListener('visibilitychange', onResume);
    };
  }, [refresh]);

  const retryIdentity = useCallback(() => refresh(false), [refresh]);

  const subject = !signedOut ? verified?.user.id : undefined;
  const getAccessTokenSilently = useCallback(() => getCookieSessionHandle(subject,verified?.session.id), [subject,verified?.session.id]);
  const loginWithRedirect = useCallback(async (options?: any) => {
    openAuthPage(options?.authorizationParams?.screen_hint === 'signup', options?.appState?.returnTo);
  }, []);
  const logout = useCallback(async () => {
    if (signOutPending.current || Date.now() < signOutRetryAt.current) return;
    signOutPending.current = true;
    if (!cookieSignOutBarrier()) setCookieSignOutBarrier(true);
    try {
      await authRequest('/sign-out', {});
      if (cookieSignOutBarrier()) window.location.replace('/landing/login');
    } catch (error) {
      if (!cookieSignOutBarrier()) return;
      const failure = error as Error & { retryAfterSeconds?: number };
      signOutRetryAt.current = Date.now() + (failure.retryAfterSeconds ?? 0) * 1000;
      setSignOutError(failure);
    } finally {
      signOutPending.current = false;
    }
  }, []);
  const value = {
    user: subject && verified ? { ...verified.user, sub: subject, email_verified: verified.user.emailVerified } : undefined,
    isAuthenticated: !!subject,
    isLoading: pending && !subject,
    error: sessionError,
    retryIdentity, signOutError,
    getAccessTokenSilently, loginWithRedirect, logout,
  } as unknown as IdentityFacade;
  return <BetterIdentityContext.Provider value={value}>{children}</BetterIdentityContext.Provider>;
}

/** The build-time provider choice cannot change during an application session. */
export function useIdentityAuth(): IdentityFacade {
  if (!betterAuthEnabled) return useAuth0();
  const identity = useContext(BetterIdentityContext);
  if (!identity) throw new Error('Identity provider is unavailable');
  return identity;
}
