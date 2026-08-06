// src/contexts/AuthContext.tsx
import React, { ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const NAMESPACE = 'https://ezboss.app';

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: ReturnType<typeof useAuth0>['user'];
  roles: string[];
  permissions: string[];
  loginWithRedirect: ReturnType<typeof useAuth0>['loginWithRedirect'];
  logout: ReturnType<typeof useAuth0>['logout'];
  getAccessTokenSilently: ReturnType<typeof useAuth0>['getAccessTokenSilently'];
}

// Passthrough — Auth0Provider (in main.tsx) already supplies context.
// Kept so App.tsx doesn't need structural changes.
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const useAuthContext = (): AuthContextType => {
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  const roles: string[] = (user?.[`${NAMESPACE}/roles`] as string[]) || [];
  const permissions: string[] = (user?.[`${NAMESPACE}/permissions`] as string[]) || [];

  return {
    isAuthenticated,
    isLoading,
    user,
    roles,
    permissions,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  };
};