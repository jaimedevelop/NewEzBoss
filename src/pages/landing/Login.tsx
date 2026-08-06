// src/pages/landing/Login.tsx
'use client';

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { AuthLayout } from '../../mainComponents/auth/AuthLayout';
import { LoadingButton } from '../../mainComponents/ui/LoadingButton';

const Login: React.FC = () => {
  const { loginWithRedirect, isLoading } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect({
      appState: { returnTo: '/dashboard' },
    });
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      <LoadingButton
        onClick={handleLogin}
        loading={isLoading}
        loadingText="Redirecting..."
        className="w-full"
        size="lg"
      >
        Sign in
      </LoadingButton>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">New to CRM Pro?</span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/landing/signup"
            className="font-medium text-orange-600 hover:text-orange-500 transition-colors"
          >
            Create your account
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;