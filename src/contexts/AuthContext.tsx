// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { User, signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { onAuthStateChange } from '../firebase/auth';
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
  taxId?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  website?: string;
  defaultTaxRate?: number;
  currency?: string;
  timezone?: string;
}

// Extended user interface combining Firebase User and our UserProfile
export interface AuthUser extends User {
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
  pageKeys: string[] | '*' | null;
  isSuperuser: boolean;
  myPermissions: MyPermissions | null;
  canAccessPage: (pageKey: string | string[]) => boolean;

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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    isAuthenticated: auth0IsAuthenticated,
    isLoading: auth0IsLoading,
    error: auth0Error,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isBridging, setIsBridging] = useState(true);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [bridgeError, setBridgeError] = useState<Error | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [pageKeys, setPageKeys] = useState<string[] | '*' | null>(null);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [myPermissions, setMyPermissions] = useState<MyPermissions | null>(null);
  const bridgedForSession = useRef(false);

  const checkOnboardingStatus = async (): Promise<void> => {
    try {
      const accessToken = await getAccessTokenSilently();
      const response = await fetch(`${API_URL}/onboarding/status`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error(`Onboarding status check failed: ${response.status}`);
      const { onboarded } = await response.json();
      setIsOnboarded(onboarded);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboarded(null);
    }
  };

  const loadMyPermissions = async (): Promise<void> => {
    setIsLoadingPermissions(true);
    try {
      const accessToken = await getAccessTokenSilently();
      const me = await getMyPermissions(accessToken);
      setPageKeys(me.pageKeys);
      setIsSuperuser(me.isSuperuser);
      setMyPermissions(me);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPageKeys([]);
      setIsSuperuser(false);
      setMyPermissions(null);
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const canAccessPage = (pageKey: string | string[]): boolean => {
    if (isSuperuser || pageKeys === '*') return true;
    const keys = Array.isArray(pageKey) ? pageKey : [pageKey];
    return keys.some((key) => !!pageKeys?.includes(key));
  };

  const loadUserProfile = async (): Promise<UserProfile | null> => {
    try {
      const accessToken = await getAccessTokenSilently();
      const response = await fetch(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error(`Failed to load profile: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  };

  const refreshUserProfile = async (): Promise<void> => {
    const profile = await loadUserProfile();
    setUserProfile(profile);
    setCurrentUser(prev => (prev ? { ...prev, profile: profile || undefined } : null));
  };

  // Once Auth0 has an authenticated session, exchange it for a Firebase
  // custom token so Firestore access (which checks request.auth.uid) keeps
  // working. Firebase's own onAuthStateChanged listener below then picks
  // up the resulting sign-in and loads the Firestore profile.
  useEffect(() => {
    if (auth0IsLoading) return;

    if (!auth0IsAuthenticated) {
      bridgedForSession.current = false;
      setIsBridging(false);
      setIsLoadingPermissions(false);
      return;
    }

    if (bridgedForSession.current) return;
    bridgedForSession.current = true;

    // Auth0 can take a moment to settle its session right after processing
    // the redirect callback: getAccessTokenSilently() sometimes rejects
    // transiently on the very first call, which used to mark the bridge as
    // failed and drop the user back on the login page even though a normal
    // retry a moment later would have succeeded. Retry a few times before
    // giving up so a single sign-in attempt is enough.
    const maxAttempts = 3;

    (async () => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          setBridgeError(null);
          const accessToken = await getAccessTokenSilently();
          const response = await fetch(`${API_URL}/auth/firebase-token`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!response.ok) {
            throw new Error(`Failed to exchange Auth0 token: ${response.status}`);
          }
          const { firebaseToken } = await response.json();
          await signInWithCustomToken(auth, firebaseToken);
          await checkOnboardingStatus();
          await loadMyPermissions();
          return;
        } catch (error) {
          // A stale/expired cached session can leave auth0IsAuthenticated
          // true for a moment even though there's no valid refresh token.
          // That's just "not actually logged in", not a failure — retrying
          // won't help, and it shouldn't block the page with an error.
          if (isBenignAuth0Error(error)) {
            bridgedForSession.current = false;
            setBridgeError(null);
            setIsBridging(false);
            setIsLoadingPermissions(false);
            return;
          }

          const isLastAttempt = attempt === maxAttempts;
          console.error(`Error bridging Auth0 session to Firebase (attempt ${attempt}/${maxAttempts}):`, error);
          if (isLastAttempt) {
            bridgedForSession.current = false;
            setBridgeError(error instanceof Error ? error : new Error(String(error)));
            setIsBridging(false);
            setIsLoadingPermissions(false);
          } else {
            await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          }
        }
      }
    })();
  }, [auth0IsAuthenticated, auth0IsLoading, getAccessTokenSilently]);

  // Firebase auth state still gates the bridge, but the profile itself now
  // comes from the Postgres-backed /profile endpoint (identity resolved
  // server-side from the Auth0 JWT, not the Firebase uid).
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        const profile = await loadUserProfile();
        const authUser: AuthUser = { ...user, profile: profile || undefined };
        setCurrentUser(authUser);
        setUserProfile(profile);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setIsBridging(false);
    });

    return unsubscribe;
  }, []);

  const login = () => {
    loginWithRedirect();
  };

  const signUp = () => {
    loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } });
  };

  const signOut = async (): Promise<void> => {
    await firebaseSignOut(auth);
    bridgedForSession.current = false;
    setIsOnboarded(null);
    setPageKeys(null);
    setIsSuperuser(false);
    setMyPermissions(null);
    setIsLoadingPermissions(true);
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const completeOnboarding = async (): Promise<void> => {
    await checkOnboardingStatus();
  };

  const getAccessToken = async (): Promise<string | undefined> => {
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      console.error('Error getting Auth0 access token:', error);
      return undefined;
    }
  };

  const updateProfile = async (userData: Partial<UserProfile>): Promise<{ success: boolean; error?: any }> => {
    try {
      const accessToken = await getAccessTokenSilently();
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `Failed to update profile: ${response.status}` }));
        return { success: false, error };
      }

      const profile: UserProfile = await response.json();
      setUserProfile(profile);
      setCurrentUser(prev => (prev ? { ...prev, profile } : null));
      return { success: true };
    } catch (error) {
      console.error('Update profile error in context:', error);
      return { success: false, error };
    }
  };

  const isLoading = auth0IsLoading || isBridging || isLoadingPermissions;
  const isAuthenticated = auth0IsAuthenticated && !!currentUser;

  const contextValue: AuthContextType = {
    currentUser,
    userProfile,
    isLoading,
    isAuthenticated,
    isOnboarded,
    auth0Error: isBenignAuth0Error(auth0Error) ? undefined : auth0Error,
    bridgeError,
    pageKeys,
    isSuperuser,
    myPermissions,
    canAccessPage,
    login,
    signUp,
    signOut,
    getAccessToken,
    updateProfile,
    refreshUserProfile,
    completeOnboarding,
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
