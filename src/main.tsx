import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN as string}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID as string}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE as string,
        // Auth0 issues a rotating refresh token only when offline access is
        // requested. This lets an existing browser session renew after an
        // access token expires, without presenting the login screen again.
        scope: 'openid profile email offline_access',
      }}
      // Keep a rotating refresh token across full page loads. Auth0 invalidates
      // the previous token whenever it is used, which limits replay exposure.
      // The Auth0 tenant must have Refresh Token Rotation enabled for this SPA.
      useRefreshTokens
      cacheLocation="localstorage"
    >
      <App />
    </Auth0Provider>
  </StrictMode>
);
