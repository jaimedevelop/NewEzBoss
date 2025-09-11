// src/mainComponents/auth/signup/TermsSection.tsx
import React from 'react';
import { Link } from 'react-router-dom';

interface TermsSectionProps {
  agreed: boolean;
  onChange: (agreed: boolean) => void;
  error?: string;
}

export const TermsSection: React.FC<TermsSectionProps> = ({
  agreed,
  onChange,
  error,
}) => {
  return (
    <div>
      <div className="flex items-start">
        <input
          id="terms"
          name="terms"
          type="checkbox"
          checked={agreed}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mt-1"
        />
        <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
          I agree to the{' '}
          <Link to="/terms" className="text-orange-600 hover:text-orange-500">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-orange-600 hover:text-orange-500">
            Privacy Policy
          </Link>
        </label>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};