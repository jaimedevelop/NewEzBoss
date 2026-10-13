import { clearRecentDocumentsCache } from '../pages/dashboard/components/recentDocuments/createRecentDocuments';
import { installCompanySession, setCompanySession } from '../services/companySession';
import { clearEstimateSearchSession } from '../pages/estimates/estimateSearchSession';
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { invalidateHierarchyCache } from '../services/categories/hierarchyApi';
import { invalidateCache as invalidateProductCache } from '../utils/productCache';
import { auth } from '../firebase/config';
import { onApiTokenError } from '../services/apiAuth';
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

export interface Membership { id: string; ownerId: number; companyName: string | null; kind: 'owner' | 'employee'; isActive: boolean; companyIsActive: boolean; employeeIsActive: boolean | null }
interface EffectivePermissions { version: string; pages: Record<string, {allowed: boolean}>; capabilities: Record<string, {allowed: boolean}>; employeeOperationsEnabled: boolean; employeeEnabledPages?: string[] }
// Auth context interface
interface AuthContextType {
  memberships: Membership[];
  membershipId: string | null;
  selectCompany: (id: string) => void;
  refreshPermissions: () => Promise<void>;
  landingPage: string;
  employeeOperationsEnabled: boolean;
  employeeEnabledPages: string[];
  canPerform: (capability: string) => boolean;
  accountKind: "employee" | "owner" | null;
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
  'invalid_grant',
]);

export const isSessionRecoveryError = (error: unknown): boolean => {
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
  clearRecentDocumentsCache();
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
  useEffect(() => {
    if (!auth0IsLoading && !auth0IsAuthenticated) clearEstimateSearchSession();
  }, [auth0IsLoading, auth0IsAuthenticated]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const selectedMembership = useRef<string | null>(null);
  const [effective, setEffective] = useState<EffectivePermissions | null>(null);
  const [sessionGeneration, setSessionGeneration] = useState(0);
  const [accountKind, setAccountKind] = useState<"employee" | "owner" | null>(null);
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
  const permissionRun = useRef(0);
  const isCurrent = (version: number) => active.current && epoch.current === version;

  useEffect(() => {
    active.current = true;
    ++epoch.current;
    installCompanySession();
    setCompanySession(null);
    clearEstimateSearchSession();
    clearCaches();
    return () => {
      active.current = false;
      ++epoch.current;
      clearCaches();
    };
  }, []);

  // Renewal can fail after initialization, when a service requests a new token.
  // Route that failure to the same reconnect action used during startup.
  useEffect(() => onApiTokenError(error => {
    if (!subject || !active.current || !isSessionRecoveryError(error)) return;
    ++initializationRun.current;
    setIsInitializing(false);
    setInitializationError(error instanceof Error ? error : Object.assign(new Error('Your session could not be renewed.'), error));
  }), [subject]);

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
        const accountResponse = await fetch(`${API_URL}/account/me${selectedMembership.current ? `?membershipId=${encodeURIComponent(selectedMembership.current)}` : ''}`, {headers:{Authorization:`Bearer ${token}`}});
        if (accountResponse.status === 409 || accountResponse.status === 403) {
          const discovery = await accountResponse.json();
          if (isCurrent(version)) { setCompanySession(null); setMemberships(discovery.memberships ?? []); setMembershipId(null); setAccountKind(null); setEffective(null); }
          return {onboarded:true,profile:null,permissions:null,kind:null};
        }
        if (!accountResponse.ok) throw new Error(`Account discovery failed: ${accountResponse.status}`);
        const account = await accountResponse.json();
        if (isCurrent(version)) {
          setMemberships(account.memberships ?? []);
          setMembershipId(account.companyContext?.membershipId ?? null);
          setEffective(account.effectivePermissions ?? null);
          setCompanySession(account.companyContext?.membershipId ?? null);
        }
        if (account.pendingIdentity) return {onboarded:false,profile:null,permissions:null,kind:null};
        if (account.companyContext?.kind === 'employee') {
          const personal = await fetch(`${API_URL}/account/employee-profile`, {headers:{Authorization:`Bearer ${token}`}});
          if (!personal.ok) throw new Error('Employee profile unavailable');
          const data = await personal.json();
          return {onboarded:true,profile:{email:auth0User?.email ?? '', firstName:data.profile.name, phone:data.profile.phoneMobile},permissions:null,kind:'employee' as const};
        }
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
        return { onboarded, profile, permissions, kind: account.companyContext?.kind === "owner" ? "owner" as const : null };
      })());
      if (!isCurrent(version) || run !== initializationRun.current) return;
      if (profileVersion === profileRun.current) setUserProfile(result.profile);
      setAccountKind(result.kind);
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
    if (accountKind === 'employee') { await initializeAccount(); return; }
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
    setCompanySession(null);
    clearEstimateSearchSession();
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
      if (isCurrent(version) && isSessionRecoveryError(error)) {
        setInitializationError(error instanceof Error ? error : Object.assign(new Error('Your session could not be renewed.'), error));
      }
      console.error('Error getting Auth0 access token:', error);
      return undefined;
    }
  };

  const updateProfile = async (userData: Partial<UserProfile>): Promise<{ success: boolean; error?: any }> => {
    if (accountKind === 'employee') return {success:false,error:new Error('Use your employee personal profile to update details.')};
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
  const canAccessPage = (key: string | string[]) => ready && (Array.isArray(key) ? key : [key]).some(item =>
    accountKind === 'employee' ? effective?.pages[item]?.allowed === true &&
      (!['inventory','collections','purchasing'].includes(item) && !item.startsWith('inventory-') || effective?.capabilities[`read:${item.startsWith('inventory-') ? 'inventory' : item}`]?.allowed === true) &&
      (!['collections','purchasing'].includes(item) || effective?.capabilities['read:inventory']?.allowed === true && ['inventory-products','inventory-tools','inventory-equipment', ...(item === 'collections' ? ['inventory-labor'] : [])].every(page => effective?.pages[page]?.allowed === true)) : isSuperuser || pageKeys === '*' || !!pageKeys?.includes(item.startsWith("inventory-") ? "inventory" : item));
  const canPerform = (key: string) => ready && (accountKind === 'employee'
    ? effective?.capabilities[key]?.allowed === true
    : canAccessPage(key.split(':')[1]));
  const landingPage = (accountKind === 'employee' && canPerform('assigned:work-orders') ? '/work-orders' :
    ['dashboard','estimates','projects','inventory','collections','work-orders','finances','purchasing','employees','clients','settings','access-control','database-management']
      .find(key => canAccessPage(key))?.replace(/^(employees|clients)$/, 'people')) || '/no-access';
  const contextValue: AuthContextType = {
    memberships, membershipId, employeeEnabledPages: effective?.employeeEnabledPages ?? [], employeeOperationsEnabled: effective?.employeeOperationsEnabled === true,
    landingPage: landingPage.startsWith('/') ? landingPage : `/${landingPage}`,
    canPerform,
    selectCompany: id => {
      if (!memberships.some(m => m.id === id && m.isActive && m.companyIsActive && (m.kind === 'owner' || m.employeeIsActive))) return;
      ++epoch.current; selectedMembership.current = id; setCompanySession(id);
      clearCaches(); clearEstimateSearchSession(); setUserProfile(null); setEffective(null); setMyPermissions(null);
      setSessionGeneration(value => value + 1); void initializeAccount();
    },
    refreshPermissions: async () => {
      const run = ++permissionRun.current;
      const version = epoch.current;
      try {
        const token = await getAccessTokenSilently();
        const response = await fetch(`${API_URL}/account/me${selectedMembership.current ? `?membershipId=${encodeURIComponent(selectedMembership.current)}` : ''}`, {headers:{Authorization:`Bearer ${token}`}});
        if (!isCurrent(version) || run !== permissionRun.current) return;
        if (!response.ok) { clearCaches(); setCompanySession(null); setEffective(null); setMyPermissions(null); return; }
        const account = await response.json();
        if (!isCurrent(version) || run !== permissionRun.current) return;
        if (effective?.version !== account.effectivePermissions?.version) clearCaches();
        setEffective(account.effectivePermissions);
        if (accountKind === 'owner') {
          const permissions = await getMyPermissions(token);
          if (isCurrent(version) && run === permissionRun.current) setMyPermissions(permissions);
        }
      } catch { if (isCurrent(version) && run === permissionRun.current) {setEffective(null); setMyPermissions(null);} }
    },
    accountKind, currentUser, userProfile, isAuthenticated, isOnboarded,
    isLoading: auth0IsLoading || isInitializing,
    auth0Error: isSessionRecoveryError(auth0Error) ? undefined : auth0Error,
    bridgeError,
    initializationError: initializationError ?? (auth0IsAuthenticated && !subject ? new Error('Auth0 identity is unavailable. Please sign in again.') : null),
    retryInitialization: async () => {
      if (!isSessionRecoveryError(initializationError)) return initializeAccount();
      // A top-level authorization can reuse the Auth0 cookie even when browser
      // privacy settings block iframe recovery. Never force logout or prompt=login.
      try {
        await loginWithRedirect({ appState: {
          returnTo: window.location.pathname + window.location.search + window.location.hash,
        } });
      } catch (error) {
        setInitializationError(error instanceof Error ? error : new Error(String(error)));
      }
    },
    pageKeys, featureKeys, isSuperuser, myPermissions,
    canAccessPage,
    canAccessFeature: key => ready && (accountKind === 'employee' ? effective?.capabilities[key]?.allowed === true : isSuperuser || featureKeys === '*' || !!featureKeys?.includes(key)),
    login: () => { void loginWithRedirect(); },
    signUp: () => { void loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } }); },
    signOut, getAccessToken, updateProfile, refreshUserProfile,
    completeOnboarding: initializeAccount,
  };
  return <AuthContext.Provider value={contextValue}><React.Fragment key={sessionGeneration}>{children}</React.Fragment></AuthContext.Provider>;
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
