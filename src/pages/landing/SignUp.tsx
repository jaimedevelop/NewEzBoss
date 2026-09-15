// src/pages/landing/SignUp.tsx
'use client';

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { AuthLayout } from '../../mainComponents/auth/AuthLayout';
import { LoadingButton } from '../../mainComponents/ui/LoadingButton';

const SignUp: React.FC = () => {
  const { signUp, isLoading } = useAuthContext();

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Bring your jobs, estimates, and finances together."
    >
      <LoadingButton
        type="button"
        onClick={signUp}
        loading={isLoading}
        loadingText="Redirecting..."
        className="w-full ez-auth-primary"
        size="lg"
      >
        Create account
      </LoadingButton>
      <p className="ez-auth-help">
        You'll finish setting up your company details right after you sign up.
      </p>

      <div className="ez-auth-alternate">
        <p>Already have an account?</p>
        <Link to="/landing/login">Sign in to your account</Link>
      </div>
    </AuthLayout>
  );
};

export default SignUp;