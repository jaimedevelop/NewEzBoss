// src/mainComponents/auth/signup/BusinessInfoSection.tsx
import React from 'react';
import { Building, Users } from 'lucide-react';
import { FormField } from '../../forms/FormField';
import { InputField } from '../../forms/InputField';
import { SelectField } from '../../forms/SelectField';

interface BusinessInfoSectionProps {
  formData: {
    company: string;
    employeeCount: string;
    tradeTypes: string[];
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onTradeTypesChange: (tradeTypes: string[]) => void;
  errors?: Record<string, string>;
}

const employeeCounts = [
  { value: '1', label: 'Just me' },
  { value: '2-5', label: '2-5 employees' },
  { value: '6-10', label: '6-10 employees' },
  { value: '11-25', label: '11-25 employees' },
  { value: '26-50', label: '26-50 employees' },
  { value: '51+', label: '51+ employees' },
];

export const tradeTypes = [
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
  onTradeTypesChange,
  errors = {},
}) => {
  const selectedTrade = formData.tradeTypes[0] ?? '';

  const selectTrade = (value: string) => {
    onTradeTypesChange([value]);
  };

  return (
    <div className="space-y-6">
      <FormField label="Business name" required error={errors.company}>
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

      <FormField label="Number of employees" required error={errors.employeeCount}>
        <SelectField
          id="employeeCount"
          name="employeeCount"
          value={formData.employeeCount}
          onChange={onChange}
          options={employeeCounts}
          icon={<Users className="h-5 w-5 text-gray-400" />}
          error={!!errors.employeeCount}
        />
      </FormField>

      <FormField label="Industry" required error={errors.tradeTypes}>
        <div className="max-h-56 overflow-y-auto border border-gray-300 rounded-md divide-y divide-gray-100">
          {tradeTypes.map((trade) => {
            const checked = selectedTrade === trade.value;
            return (
              <label
                key={trade.value}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors ${
                  checked ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="industry"
                  checked={checked}
                  onChange={() => selectTrade(trade.value)}
                  className="h-4 w-4 border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                {trade.label}
              </label>
            );
          })}
        </div>
      </FormField>
    </div>
  );
};
