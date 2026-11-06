import { BetterIdentityProvider } from './contexts/IdentityAuth';
import { betterAuthEnabled, installCookieSessionTransport } from "./services/authMode";
import type { ReactNode } from "react";
import { installReportDiagnostics } from './services/reports/diagnostics';
import { AdminStepUpDialog } from './components/security/AdminStepUpDialog';
import { browserStorageCleanupFailed } from './services/security/browserStorage';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App.tsx';
import { getAuth0Client } from './services/apiAuth';
import { safeAuthReturnTo } from './services/authRedirect';
import './index.css';

installCookieSessionTransport();
installReportDiagnostics();
const IdentityProvider = ({children}:{children:ReactNode}) => betterAuthEnabled ? <BetterIdentityProvider>{children}</BetterIdentityProvider> : <Auth0Provider client={getAuth0Client()} onRedirectCallback={appState=>{const target=safeAuthReturnTo(appState?.returnTo,window.location.origin,window.location.pathname);window.history.replaceState({},document.title,target);window.dispatchEvent(new PopStateEvent('popstate'));}}>{children}</Auth0Provider>;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {browserStorageCleanupFailed() && <div role="status" className="p-3 bg-amber-100 text-amber-950">Browser storage cleanup could not finish. Sign-in uses memory only. Clear this site's stored data in browser settings before using a shared device, and re-enter provider credentials when needed.</div>}
    <IdentityProvider>
      <AdminStepUpDialog />
      <App />
    </IdentityProvider>
  </StrictMode>
);
