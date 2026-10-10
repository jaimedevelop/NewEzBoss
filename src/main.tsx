import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App.tsx';
import { getAuth0Client } from './services/apiAuth';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider client={getAuth0Client()}>
      <App />
    </Auth0Provider>
  </StrictMode>
);
