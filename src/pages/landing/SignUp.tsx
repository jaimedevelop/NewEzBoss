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
      subtitle="Start managing your projects more efficiently"
    >
      <LoadingButton
        type="button"
        onClick={signUp}
        loading={isLoading}
        loadingText="Redirecting..."
        className="w-full"
        size="lg"
      >
        Create account
      </LoadingButton>
      <p className="mt-2 text-sm text-gray-500 text-center">
        You'll finish setting up your company details right after you sign up.
      </p>

      {/* Sign In Link */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Already have an account?</span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/landing/login"
            className="font-medium text-orange-600 hover:text-orange-500 transition-colors"
          >
            Sign in to your account
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SignUp;