// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { 
  onAuthStateChange, 
  signIn as authSignIn, 
  signUp as authSignUp, 
  signOutUser, 
  resetPassword,
  getCurrentUser,
  isAuthenticated as checkAuthStatus,
  UserData,
  AuthResult 
} from '../firebase/auth';
import { getUserProfile, updateUserProfile, UserProfile } from '../firebase/database';

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
  
  // Methods
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, userData?: UserData) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updateProfile: (userData: Partial<UserProfile>) => Promise<{ success: boolean; error?: any }>;
  refreshUserProfile: () => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user profile from database
  const loadUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const result = await getUserProfile(uid);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  };

  // Refresh user profile
  const refreshUserProfile = async (): Promise<void> => {
    if (currentUser?.uid) {
      const profile = await loadUserProfile(currentUser.uid);
      setUserProfile(profile);
      if (profile) {
        setCurrentUser(prev => prev ? { ...prev, profile } : null);
      }
    }
  };

  // Auth state change handler
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setIsLoading(true);
      
      if (user) {
        // User is signed in
        const profile = await loadUserProfile(user.uid);
        const authUser: AuthUser = { ...user, profile: profile || undefined };
        
        setCurrentUser(authUser);
        setUserProfile(profile);
        setIsAuthenticated(true);
      } else {
        // User is signed out
        setCurrentUser(null);
        setUserProfile(null);
        setIsAuthenticated(false);
      }
      
      setIsLoading(false);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  // Sign in method
  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const result = await authSignIn(email, password);
      // User profile will be loaded automatically by the auth state change listener
      return result;
    } catch (error) {
      console.error('Sign in error in context:', error);
      return {
        success: false,
        message: 'An error occurred during sign in'
      };
    }
  };

  // Sign up method
  const signUp = async (email: string, password: string, userData?: UserData): Promise<AuthResult> => {
    try {
      const result = await authSignUp(email, password, userData);
      // User profile will be loaded automatically by the auth state change listener
      return result;
    } catch (error) {
      console.error('Sign up error in context:', error);
      return {
        success: false,
        message: 'An error occurred during sign up'
      };
    }
  };

  // Sign out method
  const signOut = async (): Promise<AuthResult> => {
    try {
      const result = await signOutUser();
      // State will be cleared automatically by the auth state change listener
      return result;
    } catch (error) {
      console.error('Sign out error in context:', error);
      return {
        success: false,
        message: 'An error occurred during sign out'
      };
    }
  };

  // Update profile method
  const updateProfile = async (userData: Partial<UserProfile>): Promise<{ success: boolean; error?: any }> => {
    if (!currentUser?.uid) {
      return { success: false, error: 'No authenticated user' };
    }

    try {
      const result = await updateUserProfile(currentUser.uid, userData);
      if (result.success) {
        // Refresh the user profile after update
        await refreshUserProfile();
      }
      return result;
    } catch (error) {
      console.error('Update profile error in context:', error);
      return { success: false, error };
    }
  };

  // Context value
  const contextValue: AuthContextType = {
    // State
    currentUser,
    userProfile,
    isLoading,
    isAuthenticated,
    
    // Methods
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
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
      // Redirect to login or show auth required message
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
      return null; // Will redirect via useRequireAuth
    }

    return <Component {...props} />;
  };
};

export default AuthContext;