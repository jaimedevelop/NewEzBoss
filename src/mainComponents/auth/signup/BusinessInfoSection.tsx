// src/mainComponents/auth/signup/BusinessInfoSection.tsx
import React from 'react';
import { Building, Users } from 'lucide-react';
import { FormField } from '../../forms/FormField';
import { InputField } from '../../forms/InputField';
import { SelectField} from '../../forms/SelectField';

interface BusinessInfoSectionProps {
  formData: {
    company: string;
    companyRole: string;
    businessType: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  errors?: Record<string, string>;
}

const companyRoles = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'owner', label: 'Business Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'foreman', label: 'Foreman' },
  { value: 'technician', label: 'Technician' },
  { value: 'employee', label: 'Employee' },
  { value: 'apprentice', label: 'Apprentice' },
];

const businessTypes = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'painting', label: 'Painting' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'general_contractor', label: 'General Contractor' },
  { value: 'handyman', label: 'Handyman Services' },
  { value: 'other', label: 'Other' },
];

export const BusinessInfoSection: React.FC<BusinessInfoSectionProps> = ({
  formData,
  onChange,
  errors = {},
}) => {
  return (
    <div className="space-y-6">
      <FormField label="Company name" optional error={errors.company}>
        <InputField
          id="company"
          name="company"
          type="text"
          value={formData.company}
          onChange={onChange}
          placeholder="Your Company Inc."
          icon={<Building className="h-5 w-5 text-gray-400" />}
          error={!!errors.company}
        />
      </FormField>

      <FormField label="Your role" required error={errors.companyRole}>
        <SelectField
          id="companyRole"
          name="companyRole"
          value={formData.companyRole}
          onChange={onChange}
          options={companyRoles}
          icon={<Users className="h-5 w-5 text-gray-400" />}
          error={!!errors.companyRole}
        />
      </FormField>

      <FormField label="Type of business" required error={errors.businessType}>
        <SelectField
          id="businessType"
          name="businessType"
          value={formData.businessType}
          onChange={onChange}
          options={businessTypes}
          error={!!errors.businessType}
        />
      </FormField>
    </div>
  );
};