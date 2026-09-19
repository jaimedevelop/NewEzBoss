// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { invalidateHierarchyCache } from '../services/categories/hierarchyApi';
import { invalidateCache as invalidateProductCache } from '../utils/productCache';
import { auth } from '../firebase/config';
import { getMyPermissions } from '../services/accessControl';
import type { MyPermissions } from '../services/accessControl';

// UserProfile now mirrors the Postgres-backed contractor_profiles row
// returned by GET/PATCH /profile (see ezboss-api/src/services/profileService.ts).
export interface UserProfile {
  userId?: string;
  auth0Id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  title?: string;
  department?: string;
  profilePictureUrl?: string;
  company?: string;
  companyAddress?: string;
  companyLogo?: string;
  businessType?: string;
  employeeCount?: string;
  tradeTypes?: string[];
  licenseNumber?: string;
  licenses?: { type: string; number: string }[];
  taxId?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  defaultTaxRate?: number;
  currency?: string;
  timezone?: string;
}

// Application identity comes from Auth0; uid retains the legacy Firebase mapping.
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  profile?: UserProfile;
}

// Auth context interface
interface AuthContextType {
  // State
  currentUser: AuthUser | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean | null;
  auth0Error: Error | undefined;
  bridgeError: Error | null;
  initializationError: Error | null;
  retryInitialization: () => Promise<void>;
  pageKeys: string[] | '*' | null;
  featureKeys: string[] | '*' | null;
  isSuperuser: boolean;
  myPermissions: MyPermissions | null;
  canAccessPage: (pageKey: string | string[]) => boolean;
  canAccessFeature: (featureKey: string) => boolean;

  // Methods
  login: () => void;
  signUp: () => void;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | undefined>;
  updateProfile: (userData: Partial<UserProfile>) => Promise<{ success: boolean; error?: any }>;
  refreshUserProfile: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const API_URL = import.meta.env.VITE_API_URL as string;

// Auth0 error codes that mean "no valid session" — expected whenever a
// visitor isn't logged in (or their cached session/refresh token has
// expired), not an actual sign-in failure worth showing the user.
const BENIGN_AUTH0_ERROR_CODES = new Set([
  'login_required',
  'consent_required',
  'interaction_required',
  'missing_refresh_token',
]);

const isBenignAuth0Error = (error: unknown): boolean => {
  const code = (error as { error?: string } | null | undefined)?.error;
  return typeof code === 'string' && BENIGN_AUTH0_ERROR_CODES.has(code);
};

// Serialize SDK mutations across provider remounts and account switches. A stale
// sign-in is signed out before the next session is allowed to bridge.
let firebaseQueue: Promise<unknown> = Promise.resolve();
function queueFirebase(operation: () => Promise<void>): Promise<void> {
  const next = firebaseQueue.then(operation, operation);
  firebaseQueue = next.catch(() => undefined);
  return next;
}

function clearCaches() {
  invalidateHierarchyCache();
  invalidateProductCache();
}

// Bound account initialization even when a token/API request never settles.
async function withTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Account request timed out. Please try again.')), 20000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth0();
  // Remount all account state and consumers before rendering another identity.
  return <AuthSessionProvider key={isAuthenticated ? user?.sub ?? 'missing-sub' : 'guest'}>
    {children}
  </AuthSessionProvider>;
};

const AuthSessionProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    user: auth0User, isAuthenticated: auth0IsAuthenticated,
    isLoading: auth0IsLoading, error: auth0Error,
    loginWithRedirect, logout: auth0Logout, getAccessTokenSilently,
  } = useAuth0();
  const subject = auth0IsAuthenticated ? auth0User?.sub : undefined;
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(!!subject);
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const [bridgeError, setBridgeError] = useState<Error | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [myPermissions, setMyPermissions] = useState<MyPermissions | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const epoch = useRef(0);
  const active = useRef(false);
  const initializationRun = useRef(0);
  const profileRun = useRef(0);
  const isCurrent = (version: number) => active.current && epoch.current === version;

  useEffect(() => {
    active.current = true;
    ++epoch.current;
    clearCaches();
    return () => {
      active.current = false;
      ++epoch.current;
      clearCaches();
    };
  }, []);

  const loadUserProfile = useCallback(async (token: string): Promise<UserProfile | null> => {
    const response = await fetch(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // A new Auth0 account has no Postgres user until onboarding completes.
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Failed to load profile: ${response.status}`);
    return response.json();
  }, []);

  const initializeAccount = useCallback(async (): Promise<void> => {
    if (!subject || !active.current) return;
    const version = epoch.current;
    const run = ++initializationRun.current;
    const profileVersion = ++profileRun.current;
    setIsInitializing(true);
    setInitializationError(null);
    setMyPermissions(null);
    setIsOnboarded(null);
    try {
      const result = await withTimeout((async () => {
        const token = await getAccessTokenSilently();
        if (!isCurrent(version)) throw new Error('Session changed');
        const response = await fetch(`${API_URL}/onboarding/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Onboarding status check failed: ${response.status}`);
        const { onboarded } = await response.json();
        if (typeof onboarded !== 'boolean') throw new Error('Invalid onboarding status');
        if (!isCurrent(version)) throw new Error('Session changed');
        const [profile, permissions] = await Promise.all([
          loadUserProfile(token),
          onboarded ? getMyPermissions(token) : Promise.resolve(null),
        ]);
        if (onboarded && !profile) throw new Error('Account profile is unavailable');
        if (permissions && (
          typeof permissions.isSuperuser !== 'boolean' ||
          ![permissions.pageKeys, permissions.featureKeys].every(keys =>
            keys === '*' || (Array.isArray(keys) && keys.every(key => typeof key === 'string')))
        )) throw new Error('Invalid account permissions');
        if (onboarded && !permissions) throw new Error('Account permissions are unavailable');
        return { onboarded, profile, permissions };
      })());
      if (!isCurrent(version) || run !== initializationRun.current) return;
      if (profileVersion === profileRun.current) setUserProfile(result.profile);
      setMyPermissions(result.permissions);
      setIsOnboarded(result.onboarded);
    } catch (error) {
      if (!isCurrent(version) || run !== initializationRun.current) return;
      setInitializationError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      if (isCurrent(version) && run === initializationRun.current) setIsInitializing(false);
    }
  }, [subject, getAccessTokenSilently, loadUserProfile]);

  useEffect(() => {
    if (!auth0IsLoading && !signedOut) void initializeAccount();
  }, [auth0IsLoading, signedOut, initializeAccount]);

  useEffect(() => {
    if (auth0IsLoading || signedOut) return;
    let cancelled = false;
    const version = epoch.current;
    const valid = () => !cancelled && isCurrent(version);
    // One best-effort attempt per session effect, with no automatic retries.
    // In particular, invalid-custom-token is deterministic, not transient.
    void queueFirebase(async () => {
      if (!valid()) return;
      try {
        await firebaseSignOut(auth);
        if (!subject || !valid()) return;
        const token = await withTimeout(getAccessTokenSilently());
        if (!valid()) return;
        const response = await fetch(`${API_URL}/auth/firebase-token`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error(`Failed to exchange Auth0 token: ${response.status}`);
        const { firebaseToken } = await response.json();
        if (!valid()) return;
        await signInWithCustomToken(auth, firebaseToken);
        if (!valid()) await firebaseSignOut(auth);
      } catch (error) {
        if (!valid()) return;
        console.warn('Legacy Firebase access unavailable:', error);
        setBridgeError(error instanceof Error ? error : new Error(String(error)));
      }
    });
    return () => {
      cancelled = true;
      void queueFirebase(() => firebaseSignOut(auth)).catch(error => {
        console.warn('Legacy Firebase cleanup failed:', error);
      });
    };
  }, [subject, auth0IsLoading, signedOut, getAccessTokenSilently]);

  const refreshUserProfile = async (): Promise<void> => {
    const version = epoch.current;
    const run = ++profileRun.current;
    if (!subject || !isCurrent(version)) return;
    const profile = await withTimeout((async () => {
      const token = await getAccessTokenSilently();
      if (!isCurrent(version)) throw new Error('Session changed');
      return loadUserProfile(token);
    })());
    if (isCurrent(version) && run === profileRun.current) setUserProfile(profile);
  };

  const signOut = async (): Promise<void> => {
    active.current = false;
    ++epoch.current;
    setSignedOut(true);
    setUserProfile(null);
    setMyPermissions(null);
    setIsOnboarded(null);
    setInitializationError(null);
    setBridgeError(null);
    setIsInitializing(false);
    clearCaches();
    // Auth0 logout must not wait for an unavailable Firebase SDK/network.
    void queueFirebase(() => firebaseSignOut(auth)).catch(error => {
      console.warn('Legacy Firebase sign-out failed:', error);
    });
    await auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const getAccessToken = async (): Promise<string | undefined> => {
    const version = epoch.current;
    if (!subject || !isCurrent(version)) return undefined;
    try {
      const token = await withTimeout(getAccessTokenSilently());
      return isCurrent(version) ? token : undefined;
    } catch (error) {
      console.error('Error getting Auth0 access token:', error);
      return undefined;
    }
  };

  const updateProfile = async (userData: Partial<UserProfile>): Promise<{ success: boolean; error?: any }> => {
    const version = epoch.current;
    const run = ++profileRun.current;
    try {
      if (!subject || !isCurrent(version)) throw new Error('Not authenticated');
      const profile = await withTimeout((async () => {
        const token = await getAccessTokenSilently();
        if (!isCurrent(version)) throw new Error('Session changed');
        const response = await fetch(`${API_URL}/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(userData),
        });
        if (!response.ok) throw await response.json().catch(() => new Error(`Failed to update profile: ${response.status}`));
        return response.json() as Promise<UserProfile>;
      })());
      if (!isCurrent(version)) throw new Error('Session changed');
      if (run === profileRun.current) setUserProfile(profile);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const isAuthenticated = auth0IsAuthenticated && !!subject && !signedOut;
  const currentUser: AuthUser | null = isAuthenticated ? {
    uid: subject!.replace(/\|/g, '_'),
    email: auth0User?.email ?? null,
    displayName: auth0User?.name ?? null,
    profile: userProfile ?? undefined,
  } : null;
  const pageKeys = myPermissions?.pageKeys ?? null;
  const featureKeys = myPermissions?.featureKeys ?? null;
  const isSuperuser = myPermissions?.isSuperuser === true;
  const ready = isAuthenticated && !isInitializing && !initializationError && isOnboarded === true;
  const contextValue: AuthContextType = {
    currentUser, userProfile, isAuthenticated, isOnboarded,
    isLoading: auth0IsLoading || isInitializing,
    auth0Error: isBenignAuth0Error(auth0Error) ? undefined : auth0Error,
    bridgeError,
    initializationError: initializationError ?? (auth0IsAuthenticated && !subject ? new Error('Auth0 identity is unavailable. Please sign in again.') : null),
    retryInitialization: initializeAccount,
    pageKeys, featureKeys, isSuperuser, myPermissions,
    canAccessPage: key => ready && (isSuperuser || pageKeys === '*' ||
      (Array.isArray(key) ? key : [key]).some(item => !!pageKeys?.includes(item))),
    canAccessFeature: key => ready && (isSuperuser || featureKeys === '*' || !!featureKeys?.includes(key)),
    login: () => { void loginWithRedirect(); },
    signUp: () => { void loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } }); },
    signOut, getAccessToken, updateProfile, refreshUserProfile,
    completeOnboarding: initializeAccount,
  };
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Custom hook for protected routes
export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuthContext();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/landing/login';
    }
  }, [isAuthenticated, isLoading]);

  return { isAuthenticated, isLoading };
};

// Higher-order component for protected routes
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => {
    const { isAuthenticated, isLoading } = useRequireAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };
};

export default AuthContext;
