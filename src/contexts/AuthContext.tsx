// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { User, signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { onAuthStateChange } from '../firebase/auth';
import { getUserProfile, updateUserProfile, UserProfile } from '../firebase/database';
import { getMyPermissions } from '../services/accessControl';

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
  pageKeys: string[] | '*' | null;
  isSuperuser: boolean;
  canAccessPage: (pageKey: string) => boolean;

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
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [pageKeys, setPageKeys] = useState<string[] | '*' | null>(null);
  const [isSuperuser, setIsSuperuser] = useState(false);
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
    try {
      const accessToken = await getAccessTokenSilently();
      const me = await getMyPermissions(accessToken);
      setPageKeys(me.pageKeys);
      setIsSuperuser(me.isSuperuser);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPageKeys([]);
      setIsSuperuser(false);
    }
  };

  const canAccessPage = (pageKey: string): boolean => {
    if (isSuperuser || pageKeys === '*') return true;
    return !!pageKeys?.includes(pageKey);
  };

  const loadUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const result = await getUserProfile(uid);
      return result.success && result.data ? result.data : null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  };

  const refreshUserProfile = async (): Promise<void> => {
    if (currentUser?.uid) {
      const profile = await loadUserProfile(currentUser.uid);
      setUserProfile(profile);
      if (profile) {
        setCurrentUser(prev => (prev ? { ...prev, profile } : null));
      }
    }
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
      return;
    }

    if (bridgedForSession.current) return;
    bridgedForSession.current = true;

    (async () => {
      try {
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
      } catch (error) {
        console.error('Error bridging Auth0 session to Firebase:', error);
        setIsBridging(false);
      }
    })();
  }, [auth0IsAuthenticated, auth0IsLoading, getAccessTokenSilently]);

  // Firebase auth state drives the Firestore-backed profile, same as before.
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        const profile = await loadUserProfile(user.uid);
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
    if (!currentUser?.uid) {
      return { success: false, error: 'No authenticated user' };
    }

    try {
      const result = await updateUserProfile(currentUser.uid, userData);
      if (result.success) {
        await refreshUserProfile();
      }
      return result;
    } catch (error) {
      console.error('Update profile error in context:', error);
      return { success: false, error };
    }
  };

  const isLoading = auth0IsLoading || isBridging;
  const isAuthenticated = auth0IsAuthenticated && !!currentUser;

  const contextValue: AuthContextType = {
    currentUser,
    userProfile,
    isLoading,
    isAuthenticated,
    isOnboarded,
    auth0Error,
    pageKeys,
    isSuperuser,
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
