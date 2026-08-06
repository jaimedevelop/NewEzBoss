// src/pages/onboarding/ContractorOnboarding.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonalInfoSection } from '../../mainComponents/auth/signup/PersonalInfoSection';
import { BusinessInfoSection } from '../../mainComponents/auth/signup/BusinessInfoSection';
import { AuthLayout } from '../../mainComponents/auth/AuthLayout';
import { useAuthContext } from '../../contexts/AuthContext';

interface ContractorFormData {
  name: string;
  phone: string;
  location: string;
  company: string;
  companyAddress: string;
  companyLogo: string;
  companyRole: string;
  businessType: string;
}

const initialFormData: ContractorFormData = {
  name: '',
  phone: '',
  location: '',
  company: '',
  companyAddress: '',
  companyLogo: '',
  companyRole: '',
  businessType: '',
};

const ContractorOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuthContext();
  const [formData, setFormData] = useState<ContractorFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.companyRole) newErrors.companyRole = 'Please select your role';
    if (!formData.businessType) newErrors.businessType = 'Please select a business type';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch('/api/onboarding/contractor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save contractor profile');
      }

      navigate('/dashboard');
    } catch (err) {
      setErrors({ submit: 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Tell us about your business" subtitle="A few details to set up your account" showBackToHome={false}>
      <form onSubmit={handleSubmit} className="space-y-8">
        <PersonalInfoSection
          formData={{ name: formData.name, email: '', phone: formData.phone, location: formData.location }}
          onChange={handleChange}
          errors={errors}
        />
        <BusinessInfoSection
          formData={{
            company: formData.company,
            companyRole: formData.companyRole,
            businessType: formData.businessType,
          }}
          onChange={handleChange}
          errors={errors}
        />
        {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ContractorOnboarding;