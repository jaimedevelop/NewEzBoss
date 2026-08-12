// src/pages/landing/Onboarding.tsx
'use client';

import React, { useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { AuthLayout } from '../../mainComponents/auth/AuthLayout';
import { Alert } from '../../mainComponents/ui/Alert';
import { LoadingButton } from '../../mainComponents/ui/LoadingButton';
import { PersonalInfoSection } from '../../mainComponents/auth/signup/PersonalInfoSection';
import { BusinessInfoSection } from '../../mainComponents/auth/signup/BusinessInfoSection';

interface OnboardingFormData {
  name: string;
  phone: string;
  location: string;
  company: string;
  companyRole: string;
  businessType: string;
}

const Onboarding: React.FC = () => {
  const { getAccessToken, currentUser, completeOnboarding } = useAuthContext();

  const [formData, setFormData] = useState<OnboardingFormData>({
    name: currentUser?.displayName || '',
    phone: '',
    location: '',
    company: '',
    companyRole: 'administrator',
    businessType: 'plumbing',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = await getAccessToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/onboarding/contractor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save your details. Please try again.');
      }

      await completeOnboarding();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Tell us about your business"
      subtitle="A few quick details to finish setting up your account"
    >
      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      <form className="space-y-8" onSubmit={handleSubmit}>
        <PersonalInfoSection
          formData={{
            name: formData.name,
            phone: formData.phone,
            location: formData.location,
          }}
          onChange={handleChange}
        />

        <BusinessInfoSection
          formData={{
            company: formData.company,
            companyRole: formData.companyRole,
            businessType: formData.businessType,
          }}
          onChange={handleChange}
        />

        <LoadingButton
          type="submit"
          loading={isLoading}
          loadingText="Saving..."
          className="w-full"
          size="lg"
        >
          Finish setup
        </LoadingButton>
      </form>
    </AuthLayout>
  );
};

export default Onboarding;
