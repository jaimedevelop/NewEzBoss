// src/mainComponents/auth/AuthLayout.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wrench } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  showBackToHome?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  showBackToHome = true,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Back to Home Link */}
        {showBackToHome && (
          <div className="flex justify-center items-center mb-6">
            <Link 
              to="/landing"
              className="flex items-center text-gray-600 hover:text-orange-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Back to Home</span>
            </Link>
          </div>
        )}

        {/* Logo */}
        <div className="flex justify-center items-center mb-6">
          <Wrench className="w-10 h-10 text-orange-600" />
          <span className="ml-2 text-3xl font-bold text-gray-900">CRM Pro</span>
        </div>

        {/* Title */}
        <h2 className="text-center text-3xl font-bold text-gray-900 mb-2">
          {title}
        </h2>
        <p className="text-center text-sm text-gray-600 mb-8">
          {subtitle}
        </p>
      </div>

      {/* Form Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          Protected by enterprise-grade security
        </p>
      </div>
    </div>
  );
};