import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { authClient, authRequest, getCookieSessionHandle, openAuthPage, setExpectedCookieIdentity } from '../services/authClient';
import { betterAuthEnabled, cookieSignOutBarrier, setCookieSignOutBarrier } from '../services/authMode';

type IdentityFacade = ReturnType<typeof useAuth0>;
type CookieSession = NonNullable<Awaited<ReturnType<typeof authClient.getSession>>['data']>;
const BetterIdentityContext = createContext<IdentityFacade | null>(null);

/** One account snapshot for every React and service consumer. Outages retain open
 * work; explicit account changes hide the prior identity until freshly verified. */
export function BetterIdentityProvider({ children }: { children: ReactNode }) {
  const observed = authClient.useSession();
  const [verified, setVerified] = useState<CookieSession | null>(null);
  const [signedOut, setSignedOut] = useState(cookieSignOutBarrier);
  const [pending, setPending] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const snapshot = useRef<CookieSession | null>(null);
  const generation = useRef(0);
  const refreshing = useRef(false);
  const mounted = useRef(false);

  const refresh = useCallback(async (accountChanged: boolean) => {
    const run = ++generation.current;
    refreshing.current = true;
    if (accountChanged) {
      snapshot.current = null;
      setVerified(null);
      setPending(true);
    }
    try {
      const result = await authClient.getSession({ fetchOptions: { cache: 'no-store' } });
      if (!mounted.current || run !== generation.current) return;
      if (result.error) {
        setUnavailable(!snapshot.current);
      } else {
        snapshot.current = result.data;
        setExpectedCookieIdentity(result.data?.user.id,result.data?.session.id);
        setVerified(result.data);
        setUnavailable(false);
      }
    } catch {
      if (mounted.current && run === generation.current) setUnavailable(!snapshot.current);
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
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'ezboss.cookie.identityEpoch' || event.key === 'ezboss.cookie.signedOut') update();
    };
    window.addEventListener('storage', storage);
    window.addEventListener('ezboss:cookie-identity', update);
    void refresh(false);
    return () => {
      mounted.current = false;
      ++generation.current;
      window.removeEventListener('storage', storage);
      window.removeEventListener('ezboss:cookie-identity', update);
    };
  }, [refresh]);

  useEffect(() => {
    if (!observed.isPending && !observed.error && !refreshing.current && observed.data?.user.id !== snapshot.current?.user.id) {
      void refresh(true);
    }
  }, [observed.data?.user.id, observed.isPending, observed.error, refresh]);

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
    error: unavailable ? new Error('Authentication temporarily unavailable. Reload to retry.') : undefined,
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
