// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
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
import WorkOrders from './pages/workOrders/WorkOrders';
import Finances from './pages/finances/Finances';
import Bank from './pages/finances/components/bank/Bank';
import Budget from './pages/finances/components/budget/Budget';
import Calendar from './pages/finances/components/calendar/Calendar';
import ProductDetailPage from './mobile/inventory/detailView/products/ProductDetailPage';
import CollectionCreationOption from './pages/collections/components/CollectionCreationOption';
import CollectionAICreation from './pages/collections/components/CollectionAICreation';
import ClientLogin from './pages/client/ClientLogin';
import ClientDashboard from './pages/client/ClientDashboard';
import ClientEstimateView from './pages/client/ClientEstimateView';

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
const PageGuard: React.FC<{ pageKey: string; children: React.ReactNode }> = ({ pageKey, children }) => {
  const { canAccessPage } = useAuthContext();
  if (!canAccessPage(pageKey)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// Redirects authenticated contractors away from landing/login/signup
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, isOnboarded } = useAuthContext();
  if (isLoading || (isAuthenticated && isOnboarded === null)) return <LoadingScreen />;
  if (isAuthenticated && isOnboarded === false) return <Navigate to="/landing/onboarding" replace />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// Requires an authenticated but not-yet-onboarded contractor
const OnboardingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, isOnboarded } = useAuthContext();
  if (isLoading || (isAuthenticated && isOnboarded === null)) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/landing" replace />;
  if (isOnboarded) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading, auth0Error } = useAuthContext();
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

  return (
    <Router>
      <Routes>
        {/* ── Guest / Client routes ─────────────────────────────── */}
        {/* Declared FIRST so they win before the /* catch-all.     */}
        {/* Auth is handled internally — no contractor guard here.  */}
        <Route path="/client/login" element={<ClientLogin />} />
        <Route path="/client/dashboard" element={<ClientDashboard />} />
        <Route path="/client/estimate/:token" element={<ClientEstimateView />} />

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
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects/*" element={<PageGuard pageKey="projects"><Projects /></PageGuard>} />
                  <Route path="/collections" element={<PageGuard pageKey="collections"><Collections /></PageGuard>} />
                  <Route path="/collections/new" element={<PageGuard pageKey="collections"><CollectionCreationForm /></PageGuard>} />
                  <Route path="/collections/list" element={<PageGuard pageKey="collections"><CollectionsList /></PageGuard>} />
                  <Route path="/collections/create" element={<PageGuard pageKey="collections"><CollectionCreationOption /></PageGuard>} />
                  <Route path="/collections/ai" element={<PageGuard pageKey="collections"><CollectionAICreation /></PageGuard>} />
                  <Route path="/collections/:id" element={<PageGuard pageKey="collections"><CollectionView /></PageGuard>} />
                  <Route path="/inventory" element={<PageGuard pageKey="inventory"><InventoryHub /></PageGuard>} />
                  <Route path="/inventory/products" element={<PageGuard pageKey="inventory"><Products /></PageGuard>} />
                  <Route path="/estimates/*" element={<PageGuard pageKey="estimates"><Estimates /></PageGuard>} />
                  <Route path="/purchasing" element={<PageGuard pageKey="purchasing"><Purchasing /></PageGuard>} />
                  <Route path="/work-orders/*" element={<PageGuard pageKey="work-orders"><WorkOrders /></PageGuard>} />
                  <Route path="/settings" element={<PageGuard pageKey="settings"><Settings /></PageGuard>} />
                  <Route path="/products" element={<PageGuard pageKey="inventory"><Products /></PageGuard>} />
                  <Route path="/products/:id/detail" element={<PageGuard pageKey="inventory"><ProductDetailPage /></PageGuard>} />
                  <Route path="/people" element={<PageGuard pageKey="people"><People /></PageGuard>} />
                  <Route path="/access-control" element={<PageGuard pageKey="access-control"><AccessControl /></PageGuard>} />
                  <Route path="/finances" element={<PageGuard pageKey="finances"><Finances /></PageGuard>} />
                  <Route path="/finances/bank" element={<PageGuard pageKey="finances"><Bank /></PageGuard>} />
                  <Route path="/finances/budget" element={<PageGuard pageKey="finances"><Budget /></PageGuard>} />
                  <Route path="/finances/calendar" element={<PageGuard pageKey="finances"><Calendar /></PageGuard>} />
                  <Route path="/labor" element={<PageGuard pageKey="inventory"><Labor /></PageGuard>} />
                  <Route path="/tools" element={<PageGuard pageKey="inventory"><Tools /></PageGuard>} />
                  <Route path="/equipment" element={<PageGuard pageKey="inventory"><Equipment /></PageGuard>} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ── Fallback ──────────────────────────────────────────── */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/landing'} replace />}
        />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;