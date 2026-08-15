// src/services/apiAuth.ts
//
// Plain (non-React) Auth0 client for use inside services/* modules, which are
// called from many places that aren't React components and can't use the
// useAuth0() hook. Shares the browser's Auth0 session (SSO cookie), so it can
// silently mint access tokens without prompting the user — same audience/
// domain/clientId as the Auth0Provider in main.tsx.
import { Auth0Client } from '@auth0/auth0-spa-js';

let client: Auth0Client | null = null;

function getClient(): Auth0Client {
  if (!client) {
    client = new Auth0Client({
      domain: import.meta.env.VITE_AUTH0_DOMAIN as string,
      clientId: import.meta.env.VITE_AUTH0_CLIENT_ID as string,
      authorizationParams: {
        audience: import.meta.env.VITE_AUTH0_AUDIENCE as string,
      },
    });
  }
  return client;
}

export async function getApiAccessToken(): Promise<string> {
  return getClient().getTokenSilently();
}
