// src/pages/landing/Login.tsx
'use client';

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { AuthLayout } from '../../mainComponents/auth/AuthLayout';
import { Alert } from '../../mainComponents/ui/Alert';
import { LoadingButton } from '../../mainComponents/ui/LoadingButton';
import { FormField } from '../../mainComponents/forms/FormField';
import { InputField } from '../../mainComponents/forms/InputField';
import { PasswordField } from '../../mainComponents/forms/PasswordField';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuthContext();
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn(formData.email, formData.password);
      
      if (result.success) {
        // Navigation will be handled automatically by AuthContext and routing
        console.log('Login successful');
      } else {
        setError(result.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (formData.email) {
      // Navigate to forgot password with email pre-filled
      navigate(`/landing/forgot-password?email=${encodeURIComponent(formData.email)}`);
    } else {
      navigate('/landing/forgot-password');
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      {/* Error Alert */}
      {error && (
        <Alert
          variant="error"
          className="mb-6"
        >
          {error}
        </Alert>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Email Field */}
        <FormField label="Email address" required>
          <InputField
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            icon={<Mail className="h-5 w-5 text-gray-400" />}
          />
        </FormField>

        {/* Password Field */}
        <FormField label="Password" required>
          <PasswordField
            id="password"
            name="password"
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
          />
        </FormField>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              Remember me
            </label>
          </div>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-orange-600 hover:text-orange-500 transition-colors"
          >
            Forgot your password?
          </button>
        </div>

        {/* Submit Button */}
        <LoadingButton
          type="submit"
          loading={isLoading}
          loadingText="Signing in..."
          className="w-full"
          size="lg"
        >
          Sign in
        </LoadingButton>
      </form>

      {/* Sign Up Link */}
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