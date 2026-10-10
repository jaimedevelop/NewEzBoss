// React and non-React services must use the same session and SDK configuration.
import { Auth0Client } from '@auth0/auth0-spa-js';

let client: Auth0Client | null = null;
const tokenErrorListeners = new Set<(error: unknown) => void>();

export function onApiTokenError(listener: (error: unknown) => void): () => void {
  tokenErrorListeners.add(listener);
  return () => { tokenErrorListeners.delete(listener); };
}

export function getAuth0Client(): Auth0Client {
  if (!client) {
    client = new Auth0Client({
      domain: import.meta.env.VITE_AUTH0_DOMAIN as string,
      clientId: import.meta.env.VITE_AUTH0_CLIENT_ID as string,
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
      useRefreshTokensFallback: true,
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE as string,
        scope: 'openid profile email offline_access',
      },
    });
  }
  return client;
}

export async function getApiAccessToken(): Promise<string> {
  const listeners = [...tokenErrorListeners];
  try {
    const token = await getAuth0Client().getTokenSilently();
    // The SDK can return undefined when its configured session ceiling expires.
    if (!token) throw Object.assign(new Error('Your session has expired. Please sign in again.'), { error: 'login_required' });
    return token;
  } catch (error) {
    // Do not deliver a late failure from the previous account to a new session.
    for (const listener of listeners) {
      if (tokenErrorListeners.has(listener)) listener(error);
    }
    throw error;
  }
}
