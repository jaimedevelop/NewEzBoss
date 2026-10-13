// src/App.tsx
import React, { useEffect } from 'react';
import './pages/employee/employee.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuthContext, isSessionRecoveryError } from './contexts/AuthContext';
import CompanySelection from './pages/employee/CompanySelection';
import EmployeeAccountOnboarding from './pages/employee/EmployeeAccountOnboarding';
import Layout from './mainComponents/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import Projects from './pages/projects/Projects';
import Collections from './pages/collections/Collections';
import CollectionsList from './pages/collections/components/CollectionsList';
import CollectionView from './pages/collections/components/CollectionView';
import CollectionCreationForm from './pages/collections/components/CollectionCreationForm';
import InventoryHub from './pages/inventory/InventoryHub';
import Products from './pages/inventory/products/Products';
import Labor from './pages/inventory/labor/Labor';
import Tools from './pages/inventory/tools/Tools';
import Equipment from './pages/inventory/equipment/Equipment';
import Estimates from './pages/estimates/Estimates';
import Purchasing from './pages/purchasing/Purchasing';
import Settings from './pages/settings/Settings';
import Landing from './pages/landing/Landing';
import Login from './pages/landing/Login';
import SignUp from './pages/landing/SignUp';
import Onboarding from './pages/landing/Onboarding';
import People from './pages/people/People';
import AccessControl from './pages/accessControl/AccessControl';
import DatabaseManagement from './pages/databaseManagement/DatabaseManagement';
import WorkOrders from './pages/workOrders/WorkOrders';
import Finances from './pages/finances/Finances';
import Bank from './pages/finances/components/bank/Bank';
import Budget from './pages/finances/components/budget/Budget';
import Calendar from './pages/finances/components/calendar/Calendar';
import ProductDetailPage from './mobile/inventory/detailView/products/ProductDetailPage';
import CollectionCreationOption from './pages/collections/components/CollectionCreationOption';
import CollectionAICreation from './pages/collections/components/CollectionAICreation';
import ClientEstimateView from './pages/client/ClientEstimateView';
import ClientDeviceRoute from './mobile/client/logic/ClientDeviceRoute';
import MobileClientEstimateView from './mobile/client/views/ClientEstimateView';
import EstimatesDeviceRoute from './mobile/contractor/estimates/logic/EstimatesDeviceRoute';
import MobileEstimates from './mobile/contractor/estimates/views/MobileEstimates';
import EmployeeInviteView from './pages/employee/views/EmployeeInviteView';
import EmployeeJobView from './pages/employee/views/EmployeeJobView';

// Resets scroll position to the top on every route change
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" />
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
  if (accountKind === 'employee' && !employeeOperationsEnabled && !(Array.isArray(pageKey) ? pageKey : [pageKey]).some(key => employeeEnabledPages.includes(key) && canAccessPage(key))) return <div role="status" className="rounded bg-white p-6"><h1 className="text-xl font-semibold">Company page unavailable</h1><p>Your permissions include this page. Employee office data and assigned jobs await their company access implementation.</p></div>;
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
  const { isAuthenticated, isLoading, auth0Error, initializationError, retryInitialization, signOut, accountKind, landingPage, memberships, membershipId } = useAuthContext();
  if (window.location.pathname === '/employee-account' && !auth0Error) return <EmployeeAccountOnboarding />;
  if (isLoading) return <LoadingScreen />;

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
                <Routes>
                  <Route path="/" element={<Navigate to={landingPage} replace />} />
                  <Route path="/no-access" element={<div role="status" className="card mx-auto mt-8 max-w-lg space-y-3 p-8"><h1 className="text-xl font-semibold text-slate-900">No company pages available</h1><p className="text-sm leading-6 text-slate-600">Contact your company owner to request access.</p></div>} />
                  <Route path="/my-profile" element={accountKind === 'employee' ? <EmployeeAccountOnboarding /> : <Navigate to={landingPage} replace />} />
                  <Route path="/dashboard" element={<PageGuard pageKey="dashboard"><Dashboard /></PageGuard>} />
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

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Employee access deliberately bypasses Auth0/AuthContext loading and errors. */}
        <Route path="/employee/invite/:token" element={<EmployeeInviteView />} />
        <Route path="/employee" element={<EmployeeJobView />} />
        <Route path="/*" element={<AuthProvider><AppRoutes /></AuthProvider>} />
      </Routes>
    </Router>
  );
}

export default App;
