// src/mainComponents/auth/signup/PasswordSection.tsx
import React from 'react';
import { FormField } from '../../forms/FormField';
import { PasswordField } from '../../forms/PasswordField';

interface PasswordSectionProps {
  formData: {
    password: string;
    confirmPassword: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors?: Record<string, string>;
}

export const PasswordSection: React.FC<PasswordSectionProps> = ({
  formData,
  onChange,
  errors = {},
}) => {
  return (
    <div className="space-y-6">
      <FormField label="Password" required error={errors.password}>
        <PasswordField
          id="password"
          name="password"
          required
          value={formData.password}
          onChange={onChange}
          placeholder="Create a strong password"
          showStrength
          error={!!errors.password}
        />
      </FormField>

      <FormField label="Confirm password" required error={errors.confirmPassword}>
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          required
          value={formData.confirmPassword}
          onChange={onChange}
          placeholder="Confirm your password"
          error={!!errors.confirmPassword}
        />
      </FormField>
    </div>
  );
};