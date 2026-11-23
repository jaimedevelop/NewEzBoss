import React, { useContext, useEffect } from 'react';
import { EzBossLoader } from '../mainComponents/ui/EzBossLoader';
import type { MyPermissions } from '../services/accessControl';
import { authContext } from './authContextValue';

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

// Application identity comes from Auth0; uid retains the stable legacy identity mapping.
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  profile?: UserProfile;
}

export interface Membership { id: string; ownerId: number; companyName: string | null; kind: 'owner' | 'employee'; isActive: boolean; companyIsActive: boolean; employeeIsActive: boolean | null }
// Auth context interface
export interface AuthContextType {
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

// Custom hook to use auth context
export const useAuthContext = (): AuthContextType => {
  const context = useContext(authContext);
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
          <EzBossLoader className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };
};

export default authContext;
