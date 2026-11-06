import { EzBossLoadingProvider, EzBossLoader } from './mainComponents/ui/EzBossLoader';
import FinanceConnectionNotice from './components/common/FinanceConnectionNotice';
// src/App.tsx
import React, { useEffect } from 'react';
import './pages/employee/employee.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuthContext, isSessionRecoveryError } from './contexts/AuthContext';
import CompanySelection from './pages/employee/CompanySelection';
import EmployeeAccountOnboarding from './pages/employee/EmployeeAccountOnboarding';
import Layout from './mainComponents/Layout';
import Dashboard from './pages/dashboard/Dashboard';
const Projects = React.lazy(() => import('./pages/projects/Projects'));
const Collections = React.lazy(() => import('./pages/collections/Collections'));
const CollectionsList = React.lazy(() => import('./pages/collections/components/CollectionsList'));
const CollectionView = React.lazy(() => import('./pages/collections/components/CollectionView'));
const CollectionCreationForm = React.lazy(() => import('./pages/collections/components/CollectionCreationForm'));
const InventoryHub = React.lazy(() => import('./pages/inventory/InventoryHub'));
const Products = React.lazy(() => import('./pages/inventory/products/Products'));
const Labor = React.lazy(() => import('./pages/inventory/labor/Labor'));
const Tools = React.lazy(() => import('./pages/inventory/tools/Tools'));
const Equipment = React.lazy(() => import('./pages/inventory/equipment/Equipment'));
const Estimates = React.lazy(() => import('./pages/estimates/Estimates'));
const Purchasing = React.lazy(() => import('./pages/purchasing/Purchasing'));
const Settings = React.lazy(() => import('./pages/settings/Settings'));
import Browser from './pages/browser/Browser';
import CompanyDetails from './pages/browser/CompanyDetails';
import MarketplaceApp from './pages/marketplace/MarketplaceApp';
import CompanyEstimateRequests from './pages/marketplace/CompanyEstimateRequests';
import Landing from './pages/landing/Landing';
import Login from './pages/landing/Login';
import SignUp from './pages/landing/SignUp';
import Onboarding from './pages/landing/Onboarding';
const People = React.lazy(() => import('./pages/people/People'));
const AccessControl = React.lazy(() => import('./pages/accessControl/AccessControl'));
const DatabaseManagement = React.lazy(() => import('./pages/databaseManagement/DatabaseManagement'));
const WorkOrders = React.lazy(() => import('./pages/workOrders/WorkOrders'));
const Finances = React.lazy(() => import('./pages/finances/Finances'));
const Bank = React.lazy(() => import('./pages/finances/components/bank/Bank'));
const Budget = React.lazy(() => import('./pages/finances/components/budget/Budget'));
const Calendar = React.lazy(() => import('./pages/finances/components/calendar/Calendar'));
const ProductDetailPage = React.lazy(() => import('./mobile/inventory/detailView/products/ProductDetailPage'));
const CollectionCreationOption = React.lazy(() => import('./pages/collections/components/CollectionCreationOption'));
const CollectionAICreation = React.lazy(() => import('./pages/collections/components/CollectionAICreation'));
const ClientEstimateView = React.lazy(() => import('./pages/client/ClientEstimateView'));
import ClientDeviceRoute from './mobile/client/logic/ClientDeviceRoute';
const MobileClientEstimateView = React.lazy(() => import('./mobile/client/views/ClientEstimateView'));
import EstimatesDeviceRoute from './mobile/contractor/estimates/logic/EstimatesDeviceRoute';
const MobileEstimates = React.lazy(() => import('./mobile/contractor/estimates/views/MobileEstimates'));
import EmployeeInviteView from './pages/employee/views/EmployeeInviteView';
import EmployeeJobView from './pages/employee/views/EmployeeJobView';

const AccountLifecycleSection = React.lazy(() => import('./pages/settings/components/AccountLifecycleSection'));
const AccountDeletionHelp = React.lazy(() => import('./pages/account/AccountDeletionHelp'));

// Resets scroll position to the top on every route change
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const LoadingScreen: React.FC<{ startup?: boolean }> = ({ startup = false }) => (
  <div role="status" aria-label="Loading page" className="min-h-screen bg-gray-50 flex items-center justify-center">
    <EzBossLoader variant={startup ? "brand" : "skeleton"} />
  </div>
);

// Contractor-only guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, isOnboarded } = useAuthContext();
  if (isLoading || (isAuthenticated && isOnboarded === null)) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/landing" replace />;
  if (isOnboarded === false) return <Navigate to="/landing/onboarding" replace />;
  return <>{children}</>;
};

// Blocks access to a page the current user's role doesn't grant
const PageGuard: React.FC<{ pageKey: string | string[]; children: React.ReactNode }> = ({ pageKey, children }) => {
  const { canAccessPage, landingPage, accountKind, employeeOperationsEnabled, employeeEnabledPages, canPerform } = useAuthContext();
  const route = useLocation().pathname;
  if (accountKind === 'employee' && /^\/finances\/(bank|budget|calendar)(\/|$)/.test(route)) return <div role="status" className="card mx-auto max-w-lg p-6 text-sm leading-6 text-slate-600">This legacy finance workspace is available only to the company owner. Use Finance records for shared company accounting.</div>;
  if (accountKind === 'employee' && route === '/estimates/new' && !canPerform('write:estimates')) return <Navigate to="/estimates" replace />;
  if (accountKind === 'employee' && route === '/collections/ai') return <div role="status" className="card mx-auto max-w-lg p-6 text-sm leading-6 text-slate-600">AI collection creation is unavailable for employee accounts.</div>;
  if (accountKind === 'employee' && /^\/collections\/(new|create)$/.test(route) && !canPerform('write:collections')) return <Navigate to="/collections" replace />;
  if (!canAccessPage(pageKey)) return <Navigate to={landingPage} replace />;
  if (accountKind === 'employee' && !employeeOperationsEnabled && !(Array.isArray(pageKey) ? pageKey : [pageKey]).some(key => employeeEnabledPages.includes(key) && canAccessPage(key))) return <div role="status" className="rounded bg-white p-6"><h1 className="text-xl font-semibold">Company page unavailable</h1><p>This page is currently unavailable for employee accounts. Contact your company owner for access to a supported workspace.</p></div>;
  return <>{children}</>;
};

// Redirects authenticated contractors away from landing/login/signup
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, isOnboarded, landingPage } = useAuthContext();
  if (isLoading || (isAuthenticated && isOnboarded === null)) return <LoadingScreen />;
  if (isAuthenticated && isOnboarded === false) return <Navigate to="/landing/onboarding" replace />;
  if (isAuthenticated) return <Navigate to={landingPage} replace />;
  return <>{children}</>;
};

// Requires an authenticated but not-yet-onboarded contractor
const OnboardingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, isOnboarded, landingPage } = useAuthContext();
  if (isLoading || (isAuthenticated && isOnboarded === null)) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/landing" replace />;
  if (isOnboarded) return <Navigate to={landingPage} replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading, isOnboarded, auth0Error, initializationError, retryInitialization, signOut, accountKind, landingPage, memberships, membershipId, currentUser } = useAuthContext();
  const location = useLocation();
  // Actor-scoped account requests remain reachable when company discovery fails.
  if (location.pathname === '/account-requests' && isAuthenticated && !auth0Error) return <main className="mx-auto max-w-2xl space-y-4 p-4"><AccountLifecycleSection key={currentUser?.uid ?? "pending-identity"} /><button className="min-h-11 underline" onClick={() => void signOut()}>Sign out</button></main>;
  if (window.location.pathname === '/employee-account' && !auth0Error) return <EmployeeAccountOnboarding />;
  if (isLoading) return <LoadingScreen startup={!isAuthenticated} />;

  // Keep the contractor workspace when following Browser links into client requests.
  // Client-only accounts can still use the marketplace without company onboarding.
  if (location.pathname === '/marketplace' || location.pathname.startsWith('/marketplace/')) {
    const marketplace = <MarketplaceApp />;
    return isAuthenticated && isOnboarded && accountKind === 'owner' && membershipId && !auth0Error && !initializationError
      ? <Layout>{marketplace}</Layout>
      : marketplace;
  }

  if (auth0Error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-red-700 mb-2">Auth0 sign-in error</h1>
          <p className="text-sm text-gray-700">{auth0Error.message}</p>
        </div>
      </div>
    );
  }

  if (initializationError) {
    const needsSignIn = isSessionRecoveryError(initializationError);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-red-700 mb-2">Unable to load your account</h1>
          <p className="text-sm text-gray-700">
            {needsSignIn ? 'Your saved session could not be renewed. Continue sign in to reconnect your account.' : initializationError.message}
          </p>
          <button className="mt-4 rounded bg-orange-600 px-4 py-2 text-white" onClick={() => void retryInitialization()}>{needsSignIn ? 'Continue sign in' : 'Try again'}</button>
          <Link className="block min-h-11 py-3 underline" to="/account-requests">Account requests and terms</Link>
          <button className="ml-4 text-gray-700 underline" onClick={() => void signOut()}>Sign out</button>
        </div>
      </div>
    );
  }

  if (window.location.pathname === '/employee-account') return <EmployeeAccountOnboarding />;
  if (isAuthenticated && !membershipId && memberships.length > 1) return <CompanySelection />;
  return (
      <Routes>
        {/* ── Guest / Client routes ─────────────────────────────── */}
        {/* Declared FIRST so they win before the /* catch-all.     */}
        {/* Estimates are accessed through a per-estimate emailed link. */}
        <Route path="/client/estimate/:token" element={
          <ClientDeviceRoute mobile={<MobileClientEstimateView />} desktop={<ClientEstimateView />} />
        } />

        <Route path="/account-requests" element={<Login />} />

        {/* ── Contractor public routes ──────────────────────────── */}
        <Route path="/landing" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/landing/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/landing/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
        <Route path="/landing/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />

        {/* ── Protected contractor routes ───────────────────────── */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <React.Suspense fallback={<div className="p-4"><EzBossLoader /></div>}>
                <Routes>
                  <Route path="/" element={<Navigate to={landingPage} replace />} />
                  <Route path="/no-access" element={landingPage !== '/no-access' ? <Navigate to={landingPage} replace /> : <div role="status" className="card mx-auto mt-8 max-w-lg space-y-3 p-8"><h1 className="text-xl font-semibold text-slate-900">No company pages available</h1><p className="text-sm leading-6 text-slate-600">Contact your company owner to request access.</p></div>} />
                  <Route path="/my-profile" element={accountKind === 'employee' ? <EmployeeAccountOnboarding /> : <Navigate to={landingPage} replace />} />
                  <Route path="/dashboard" element={<PageGuard pageKey="dashboard"><Dashboard /></PageGuard>} />
                  <Route path="/browser" element={<Browser />} />
                  <Route path="/browser/company/:slug" element={<CompanyDetails />} />
                  <Route path="/estimate-requests/*" element={<PageGuard pageKey="estimates"><CompanyEstimateRequests /></PageGuard>} />
                  <Route path="/projects/*" element={<PageGuard pageKey="projects"><Projects /></PageGuard>} />
                  <Route path="/collections" element={<PageGuard pageKey="collections"><Collections /></PageGuard>} />
                  <Route path="/collections/new" element={<PageGuard pageKey="collections"><CollectionCreationForm /></PageGuard>} />
                  <Route path="/collections/list" element={<PageGuard pageKey="collections"><CollectionsList /></PageGuard>} />
                  <Route path="/collections/create" element={<PageGuard pageKey="collections"><CollectionCreationOption /></PageGuard>} />
                  <Route path="/collections/ai" element={<PageGuard pageKey="collections"><CollectionAICreation /></PageGuard>} />
                  <Route path="/collections/:id" element={<PageGuard pageKey="collections"><CollectionView /></PageGuard>} />
                  <Route path="/inventory" element={<PageGuard pageKey="inventory"><InventoryHub /></PageGuard>} />
                  <Route path="/inventory/products" element={<PageGuard pageKey="inventory-products"><Products /></PageGuard>} />
                  <Route path="/estimates/*" element={<PageGuard pageKey="estimates"><EstimatesDeviceRoute mobile={accountKind === 'employee' ? <Estimates /> : <MobileEstimates />} desktop={<Estimates />} /></PageGuard>} />
                  <Route path="/purchasing" element={<PageGuard pageKey="purchasing"><Purchasing /></PageGuard>} />
                  <Route path="/work-orders/*" element={<PageGuard pageKey="work-orders"><WorkOrders /></PageGuard>} />
                  <Route path="/settings" element={<PageGuard pageKey="settings"><Settings /></PageGuard>} />
                  <Route path="/products" element={<PageGuard pageKey="inventory-products"><Products /></PageGuard>} />
                  <Route path="/products/:id/detail" element={<PageGuard pageKey="inventory-products"><ProductDetailPage /></PageGuard>} />
                  <Route path="/people" element={<PageGuard pageKey={['employees', 'clients']}><People /></PageGuard>} />
                  <Route path="/access-control" element={<PageGuard pageKey="access-control"><AccessControl /></PageGuard>} />
                  <Route path="/database-management" element={<PageGuard pageKey="database-management"><DatabaseManagement /></PageGuard>} />
                  <Route path="/finances" element={<PageGuard pageKey="finances"><Finances /></PageGuard>} />
                  <Route path="/finances/bank" element={<PageGuard pageKey="finances"><Bank /></PageGuard>} />
                  <Route path="/finances/budget" element={<PageGuard pageKey="finances"><Budget /></PageGuard>} />
                  <Route path="/finances/calendar" element={<PageGuard pageKey="finances"><Calendar /></PageGuard>} />
                  <Route path="/labor" element={<PageGuard pageKey="inventory-labor"><Labor /></PageGuard>} />
                  <Route path="/tools" element={<PageGuard pageKey="inventory-tools"><Tools /></PageGuard>} />
                  <Route path="*" element={<Navigate to={landingPage} replace />} />
                  <Route path="/equipment" element={<PageGuard pageKey="inventory-equipment"><Equipment /></PageGuard>} />
                </Routes>
                </React.Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ── Fallback ──────────────────────────────────────────── */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? landingPage : '/landing'} replace />}
        />
      </Routes>
  );
};

// A new signed-in identity gets one startup reveal. Navigation and data loaders
// never control this boundary, so tab changes have no artificial completion delay.
function StartupWorkspace() {
  const { isAuthenticated, isLoading, isOnboarded, currentUser, auth0Error, initializationError } = useAuthContext();
  const ready = isAuthenticated && !isLoading && isOnboarded !== null && !auth0Error && !initializationError;
  return <EzBossLoadingProvider key={isAuthenticated ? currentUser?.uid ?? 'signed-in' : 'signed-out'} ready={ready}><AppRoutes /></EzBossLoadingProvider>;
}

function App() {
  return (
    <Router><FinanceConnectionNotice />
      <ScrollToTop />
      <React.Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/account-deletion" element={<AccountDeletionHelp />} />
        {/* Employee access deliberately bypasses Auth0/AuthContext loading and errors. */}
        <Route path="/employee/invite/:token" element={<EmployeeInviteView />} />
        <Route path="/employee" element={<EmployeeJobView />} />
        <Route path="/*" element={<AuthProvider><StartupWorkspace /></AuthProvider>} />
      </Routes>
      </React.Suspense>
    </Router>
  );
}

export default App;
