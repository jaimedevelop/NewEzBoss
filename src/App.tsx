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
                  <Route path="/projects/*" element={<Projects />} />
                  <Route path="/collections" element={<Collections />} />
                  <Route path="/collections/new" element={<CollectionCreationForm />} />
                  <Route path="/collections/list" element={<CollectionsList />} />
                  <Route path="/collections/create" element={<CollectionCreationOption />} />
                  <Route path="/collections/ai" element={<CollectionAICreation />} />
                  <Route path="/collections/:id" element={<CollectionView />} />
                  <Route path="/inventory" element={<InventoryHub />} />
                  <Route path="/inventory/products" element={<Products />} />
                  <Route path="/estimates/*" element={<Estimates />} />
                  <Route path="/purchasing" element={<Purchasing />} />
                  <Route path="/work-orders/*" element={<WorkOrders />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/:id/detail" element={<ProductDetailPage />} />
                  <Route path="/people" element={<People />} />
                  <Route path="/access-control" element={<AccessControl />} />
                  <Route path="/finances" element={<Finances />} />
                  <Route path="/finances/bank" element={<Bank />} />
                  <Route path="/finances/budget" element={<Budget />} />
                  <Route path="/finances/calendar" element={<Calendar />} />
                  <Route path="/labor" element={<Labor />} />
                  <Route path="/tools" element={<Tools />} />
                  <Route path="/equipment" element={<Equipment />} />
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