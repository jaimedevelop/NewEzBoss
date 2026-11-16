import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { authRequest, getCookieSessionHandle, openAuthPage, readCookieSession, setExpectedCookieIdentity } from '../services/authClient';
import { betterAuthEnabled, cookieSignOutBarrier, setCookieSignOutBarrier } from '../services/authMode';

type IdentityFacade = ReturnType<typeof useAuth0> & { retryIdentity?: () => Promise<void> };
type CookieSession = NonNullable<Awaited<ReturnType<typeof readCookieSession>>>;
const BetterIdentityContext = createContext<IdentityFacade | null>(null);

/** One account snapshot for every React and service consumer. Outages retain open
 * work; explicit account changes hide the prior identity until freshly verified. */
export function BetterIdentityProvider({ children }: { children: ReactNode }) {
  const [verified, setVerified] = useState<CookieSession | null>(null);
  const [signedOut, setSignedOut] = useState(cookieSignOutBarrier);
  const [pending, setPending] = useState(true);
  const [sessionError, setSessionError] = useState<Error>();
  const snapshot = useRef<CookieSession | null>(null);
  const generation = useRef(0);
  const refreshing = useRef(false);
  const mounted = useRef(false);

  const refresh = useCallback(async (accountChanged: boolean) => {
    const run = ++generation.current;
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
      setExpectedCookieIdentity(session?.user.id, session?.session.id);
      setVerified(session);
      setSessionError(undefined);
    } catch (error) {
      if (mounted.current && run === generation.current && !snapshot.current) {
        setSessionError(error instanceof Error ? error :
          new Error('Authentication temporarily unavailable. Try again.'));
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
    const update = () => { setSignedOut(cookieSignOutBarrier()); void refresh(true); };
    const onFocus = () => { if (!refreshing.current && !cookieSignOutBarrier()) void refresh(false); };
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'ezboss.cookie.identityEpoch' || event.key === 'ezboss.cookie.signedOut') update();
    };
    window.addEventListener('storage', storage);
    window.addEventListener('ezboss:cookie-identity', update);
    window.addEventListener('focus', onFocus);
    void refresh(false);
    return () => {
      mounted.current = false;
      ++generation.current;
      window.removeEventListener('storage', storage);
      window.removeEventListener('ezboss:cookie-identity', update);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const retryIdentity = useCallback(() => refresh(false), [refresh]);

  const subject = !signedOut ? verified?.user.id : undefined;
  const getAccessTokenSilently = useCallback(() => getCookieSessionHandle(subject,verified?.session.id), [subject,verified?.session.id]);
  const loginWithRedirect = useCallback(async (options?: any) => {
    openAuthPage(options?.authorizationParams?.screen_hint === 'signup', options?.appState?.returnTo);
  }, []);
  const logout = useCallback(async () => {
    setCookieSignOutBarrier(true);
    await authRequest('/sign-out', {});
    window.location.replace('/landing/login');
  }, []);
  const value = {
    user: subject && verified ? { ...verified.user, sub: subject, email_verified: verified.user.emailVerified } : undefined,
    isAuthenticated: !!subject,
    isLoading: pending && !subject,
    error: sessionError,
    retryIdentity,
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
