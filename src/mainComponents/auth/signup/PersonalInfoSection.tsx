// src/mainComponents/auth/signup/PersonalInfoSection.tsx
import React from 'react';
import { User, Phone } from 'lucide-react';
import { FormField } from '../../forms/FormField';
import { InputField } from '../../forms/InputField';

interface PersonalInfoSectionProps {
  formData: {
    firstName: string;
    lastName: string;
    phone: string;
    smsOptIn: boolean;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors?: Record<string, string>;
}

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  formData,
  onChange,
  errors = {},
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <FormField label="First name" required error={errors.firstName}>
          <InputField
            id="firstName"
            name="firstName"
            type="text"
            required
            value={formData.firstName}
            onChange={onChange}
            placeholder="John"
            icon={<User className="h-5 w-5 text-gray-400" />}
            error={!!errors.firstName}
          />
        </FormField>

        <FormField label="Last name" required error={errors.lastName}>
          <InputField
            id="lastName"
            name="lastName"
            type="text"
            required
            value={formData.lastName}
            onChange={onChange}
            placeholder="Doe"
            icon={<User className="h-5 w-5 text-gray-400" />}
            error={!!errors.lastName}
          />
        </FormField>
      </div>

      <FormField label="Phone number" required error={errors.phone}>
        <InputField
          id="phone"
          name="phone"
          type="tel"
          required
          value={formData.phone}
          onChange={onChange}
          placeholder="(555) 123-4567"
          icon={<Phone className="h-5 w-5 text-gray-400" />}
          error={!!errors.phone}
        />
      </FormField>

      <div className="flex items-start">
        <input
          id="smsOptIn"
          name="smsOptIn"
          type="checkbox"
          checked={formData.smsOptIn}
          onChange={onChange}
          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mt-1"
        />
        <label htmlFor="smsOptIn" className="ml-2 block text-sm text-gray-700">
          Send me text message notifications
          {/* TODO: wire this opt-in up to actually enable/disable SMS notifications once that system exists */}
        </label>
      </div>
    </div>
  );
};
