// src/pages/landing/Login.tsx
'use client';

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { AuthLayout } from '../../mainComponents/auth/AuthLayout';
import { LoadingButton } from '../../mainComponents/ui/LoadingButton';

const Login: React.FC = () => {
  const { login, isLoading } = useAuthContext();

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Pick up where you left off. Your next job is waiting."
    >
      <LoadingButton
        type="button"
        onClick={login}
        loading={isLoading}
        loadingText="Redirecting..."
        className="w-full ez-auth-primary"
        size="lg"
      >
        Sign in
      </LoadingButton>

      <div className="ez-auth-alternate">
        <p>New to EzBoss?</p>
        <Link to="/landing/signup">Create your account</Link>
      </div>
    </AuthLayout>
  );
};

export default Login;
