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
  firstName: string;
  lastName: string;
  phone: string;
  smsOptIn: boolean;
  company: string;
  employeeCount: string;
  tradeTypes: string[];
}

const STEPS = [
  { key: 'personal', title: 'Tell us about yourself', subtitle: 'A few quick details to get started' },
  { key: 'business', title: 'Tell us about your business', subtitle: 'Help us tailor EzBoss to your trade' },
] as const;

const Onboarding: React.FC = () => {
  const { getAccessToken, currentUser, completeOnboarding, refreshUserProfile } = useAuthContext();

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingFormData>({
    firstName: currentUser?.displayName?.split(' ')[0] || '',
    lastName: currentUser?.displayName?.split(' ').slice(1).join(' ') || '',
    phone: '',
    smsOptIn: false,
    company: '',
    employeeCount: '1',
    tradeTypes: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const nextValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: nextValue }));
    if (error) setError('');
  };

  const handleTradeTypesChange = (tradeTypes: string[]) => {
    setFormData(prev => ({ ...prev, tradeTypes }));
    if (error) setError('');
  };

  const validateStep = (index: number): string => {
    if (index === 0) {
      if (!formData.firstName.trim()) return 'First name is required';
      if (!formData.lastName.trim()) return 'Last name is required';
      if (!formData.phone.trim()) return 'Phone number is required';
    }
    if (index === 1) {
      if (!formData.company.trim()) return 'Business name is required';
      if (!formData.employeeCount) return 'Please select the number of employees';
      if (formData.tradeTypes.length === 0) return 'Please select an industry';
    }
    return '';
  };

  const handleNext = () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
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
      await refreshUserProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <AuthLayout
      title={STEPS[step].title}
      subtitle={STEPS[step].subtitle}
    >
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {STEPS.map((s, index) => (
          <div
            key={s.key}
            className={`h-1.5 rounded-full transition-all ${
              index === step ? 'w-8 bg-orange-600' : index < step ? 'w-4 bg-orange-300' : 'w-4 bg-gray-200'
            }`}
          />
        ))}
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      <form
        className="space-y-8"
        onSubmit={isLastStep ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}
      >
        {step === 0 && (
          <PersonalInfoSection
            formData={{
              firstName: formData.firstName,
              lastName: formData.lastName,
              phone: formData.phone,
              smsOptIn: formData.smsOptIn,
            }}
            onChange={handleChange}
          />
        )}

        {step === 1 && (
          <BusinessInfoSection
            formData={{
              company: formData.company,
              employeeCount: formData.employeeCount,
              tradeTypes: formData.tradeTypes,
            }}
            onChange={handleChange}
            onTradeTypesChange={handleTradeTypesChange}
          />
        )}

        <div className="flex items-center gap-3">
          {step > 0 && (
            <LoadingButton
              type="button"
              variant="outline"
              onClick={handleBack}
              className="flex-1 ez-auth-secondary"
              size="lg"
            >
              Back
            </LoadingButton>
          )}

          {isLastStep ? (
            <LoadingButton
              type="submit"
              loading={isLoading}
              loadingText="Saving..."
              className="flex-1 ez-auth-primary"
              size="lg"
            >
              Finish setup
            </LoadingButton>
          ) : (
            <LoadingButton type="submit" className="flex-1 ez-auth-primary" size="lg">
              Continue
            </LoadingButton>
          )}
        </div>
      </form>
    </AuthLayout>
  );
};

export default Onboarding;
