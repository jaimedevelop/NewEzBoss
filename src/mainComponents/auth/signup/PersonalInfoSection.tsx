// src/mainComponents/auth/signup/PersonalInfoSection.tsx
import React from 'react';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import { FormField } from '../../forms/FormField';
import { InputField } from '../../forms/InputField';

interface PersonalInfoSectionProps {
  formData: {
    name: string;
    email: string;
    phone: string;
    location: string;
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
      <FormField label="Full name" required error={errors.name}>
        <InputField
          id="name"
          name="name"
          type="text"
          required
          value={formData.name}
          onChange={onChange}
          placeholder="John Doe"
          icon={<User className="h-5 w-5 text-gray-400" />}
          error={!!errors.name}
        />
      </FormField>

      <FormField label="Email address" required error={errors.email}>
        <InputField
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={onChange}
          placeholder="john@example.com"
          icon={<Mail className="h-5 w-5 text-gray-400" />}
          error={!!errors.email}
        />
      </FormField>

      <FormField label="Phone number" optional error={errors.phone}>
        <InputField
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={onChange}
          placeholder="(555) 123-4567"
          icon={<Phone className="h-5 w-5 text-gray-400" />}
          error={!!errors.phone}
        />
      </FormField>

      <FormField label="Location" optional error={errors.location}>
        <InputField
          id="location"
          name="location"
          type="text"
          value={formData.location}
          onChange={onChange}
          placeholder="Tampa, FL"
          icon={<MapPin className="h-5 w-5 text-gray-400" />}
          error={!!errors.location}
        />
      </FormField>
    </div>
  );
};