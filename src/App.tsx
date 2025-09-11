// src/App.tsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChange, getCurrentUser } from './firebase/index.ts';
import Layout from './mainComponents/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import Projects from './pages/projects/Projects';
import Inventory from './pages/inventory/Inventory';
import Estimates from './pages/estimates/Estimates';
import Settings from './pages/settings/Settings';
import Landing from './pages/landing/Landing';
import Login from './pages/landing/Login';
import SignUp from './pages/landing/SignUp';

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
  isAuthenticated: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, isAuthenticated }) => {
  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />;
  }
  return <>{children}</>;
};

// Public Route component (redirects to dashboard if authenticated)
interface PublicRouteProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children, isAuthenticated }) => {
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Set up authentication state listener
    const unsubscribe = onAuthStateChange((user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);
    });

    // Check initial auth state
    const currentUser = getCurrentUser();
    if (currentUser) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Show loading screen while checking auth state
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
            <PublicRoute isAuthenticated={isAuthenticated}>
              <Landing />
            </PublicRoute>
          } 
        />
        <Route 
          path="/landing/login" 
          element={
            <PublicRoute isAuthenticated={isAuthenticated}>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/landing/signup" 
          element={
            <PublicRoute isAuthenticated={isAuthenticated}>
              <SignUp />
            </PublicRoute>
          } 
        />

        {/* Protected Routes (Main App) */}
        <Route 
          path="/*" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/estimates" element={<Estimates />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Default redirect - if not authenticated, go to landing; if authenticated, go to dashboard */}
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
}

export default App;