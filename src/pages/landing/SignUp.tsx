// src/pages/landing/SignUp.tsx
'use client';

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp } from '../../firebase';
import { AuthLayout } from '../../mainComponents/auth/AuthLayout';
import { Alert } from '../../mainComponents/ui/Alert';
import { LoadingButton } from '../../mainComponents/ui/LoadingButton';
import { PersonalInfoSection } from '../../mainComponents/auth/signup/PersonalInfoSection';
import { BusinessInfoSection } from '../../mainComponents/auth/signup/BusinessInfoSection';
import { PasswordSection } from '../../mainComponents/auth/signup/PasswordSection';
import { TermsSection } from '../../mainComponents/auth/signup/TermsSection';

interface SignUpFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  companyRole: string;
  businessType: string;
  location: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  [key: string]: string;
}

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignUpFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    companyRole: 'administrator',
    businessType: 'plumbing',
    location: '',
    password: '',
    confirmPassword: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear errors when user starts typing
    if (error) setError('');
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!agreedToTerms) {
      errors.terms = 'You must agree to the Terms of Service and Privacy Policy';
    }

    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setError('Please correct the errors below');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const userData = {
        displayName: formData.name,
        name: formData.name,
        phone: formData.phone,
        company: formData.company,
        companyRole: formData.companyRole,
        businessType: formData.businessType,
        location: formData.location,
        // Set default role based on company role
        role: ['administrator', 'owner', 'manager'].includes(formData.companyRole) ? 'admin' : 'user',
        // Additional CRM-specific fields
        profileComplete: false,
        onboardingCompleted: false,
        preferences: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
        },
      };

      const result = await signUp(formData.email, formData.password, userData);
      
      if (result.success) {
        setSuccess(result.message || 'Account created successfully!');
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(result.message || 'Account creation failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Sign up error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start managing your projects more efficiently"
    >
      {/* Success Alert */}
      {success && (
        <Alert
          type="success"
          message={success}
          className="mb-6"
        />
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          type="error"
          message={error}
          className="mb-6"
        />
      )}

      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* Personal Information */}
        <PersonalInfoSection
          formData={{
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            location: formData.location,
          }}
          onChange={handleChange}
          errors={fieldErrors}
        />

        {/* Business Information */}
        <BusinessInfoSection
          formData={{
            company: formData.company,
            companyRole: formData.companyRole,
            businessType: formData.businessType,
          }}
          onChange={handleChange}
          errors={fieldErrors}
        />

        {/* Password Information */}
        <PasswordSection
          formData={{
            password: formData.password,
            confirmPassword: formData.confirmPassword,
          }}
          onChange={handleChange}
          errors={fieldErrors}
        />

        {/* Terms Agreement */}
        <TermsSection
          agreed={agreedToTerms}
          onChange={setAgreedToTerms}
          error={fieldErrors.terms}
        />

        {/* Submit Button */}
        <LoadingButton
          type="submit"
          loading={isLoading}
          loadingText="Creating account..."
          className="w-full"
          size="lg"
        >
          Create account
        </LoadingButton>
      </form>

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