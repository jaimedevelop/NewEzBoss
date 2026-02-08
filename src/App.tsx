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
import { ClientEstimateView } from './pages/client/ClientEstimateView';
import People from './pages/people/People';
import ClientLayout from './pages/client/ClientLayout';
import ClientDashboard from './pages/client/ClientDashboard';
import WorkOrders from './pages/workOrders/WorkOrders';
import Finances from './pages/finances/Finances';
import Bank from './pages/finances/components/bank/Bank';
import Budget from './pages/finances/components/budget/Budget';
import Calendar from './pages/finances/components/calendar/Calendar';


// Loading component for auth state
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Protected Route component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />;
  }

  return <>{children}</>;
};

// Public Route component (redirects to dashboard if authenticated)
interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// App Routes component (needs to be inside AuthProvider)
const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes (Landing, Login, SignUp) */}
        <Route
          path="/landing"
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          }
        />
        <Route
          path="/landing/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/landing/signup"
          element={
            <PublicRoute>
              <SignUp />
            </PublicRoute>
          }
        />

        {/* Public Client Portal Route (no auth required) */}
        <Route
          path="/client/estimate/:token"
          element={<ClientEstimateView />}
        />

        {/* Client Portal Protected Routes */}
        <Route
          path="/client/*"
          element={
            <ProtectedRoute>
              <ClientLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="dashboard" replace />} />
                  <Route path="/dashboard" element={<ClientDashboard />} />
                  {/* More client routes can be added here */}
                </Routes>
              </ClientLayout>
            </ProtectedRoute>
          }
        />

        {/* Protected Routes (Main App) */}
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
                  <Route path="/collections" element={<Collections />} />
                  <Route path="/collections/new" element={<CollectionCreationForm />} />
                  <Route path="/collections/list" element={<CollectionsList />} />
                  <Route path="/collections/:id" element={<CollectionView />} />
                  <Route path="/inventory" element={<InventoryHub />} />
                  <Route path="/inventory/products" element={<Products />} />
                  <Route path="/estimates/*" element={<Estimates />} />
                  <Route path="/purchasing" element={<Purchasing />} />
                  <Route path="/work-orders/*" element={<WorkOrders />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/people" element={<People />} />
                  <Route path="/finances" element={<Finances />} />
                  <Route path="/finances/bank" element={<Bank />} />
                  <Route path="/finances/budget" element={<Budget />} />
                  <Route path="/finances/calendar" element={<Calendar />} />

                  {/* Labor Routes */}
                  <Route path="/labor" element={<Labor />} />

                  <Route path="/tools" element={<Tools />} />
                  <Route path="/equipment" element={<Equipment />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route
          path="*"
          element={
            isAuthenticated ?
              <Navigate to="/dashboard" replace /> :
              <Navigate to="/landing" replace />
          }
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