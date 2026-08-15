// src/services/apiAuth.ts
//
// Plain (non-React) Auth0 client for use inside services/* modules, which are
// called from many places that aren't React components and can't use the
// useAuth0() hook. getTokenSilently() does NOT share state across separate
// Auth0Client instances by default (each keeps its own in-memory cache) — it
// only works here because both this client and the Auth0Provider in main.tsx
// are configured with cacheLocation: 'localstorage', so they read/write the
// same cached tokens and this client can mint access tokens without a login
// prompt as long as the user has an active session from the React provider.
import { Auth0Client } from '@auth0/auth0-spa-js';

let client: Auth0Client | null = null;

function getClient(): Auth0Client {
  if (!client) {
    client = new Auth0Client({
      domain: import.meta.env.VITE_AUTH0_DOMAIN as string,
      clientId: import.meta.env.VITE_AUTH0_CLIENT_ID as string,
      cacheLocation: 'localstorage',
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
