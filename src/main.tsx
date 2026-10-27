import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App.tsx';
import { getAuth0Client } from './services/apiAuth';
import { safeAuthReturnTo } from './services/authRedirect';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider client={getAuth0Client()} onRedirectCallback={appState => {
      const target = safeAuthReturnTo(appState?.returnTo, window.location.origin, window.location.pathname);
      window.history.replaceState({}, document.title, target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }}>
      <App />
    </Auth0Provider>
  </StrictMode>
);
