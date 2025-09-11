// src/mainComponents/forms/PasswordField.tsx
import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrength?: boolean;
  error?: boolean;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  showStrength = false,
  error,
  value,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password || password.length === 0) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    if (strength <= 2) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength, label: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { strength, label: 'Good', color: 'bg-orange-500' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(value as string);

  return (
    <div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Lock className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          className={`block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 ${
            error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
          } ${className}`}
          {...props}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500" />
          ) : (
            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500" />
          )}
        </button>
      </div>
      
      {/* Password Strength Indicator */}
      {showStrength && value && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Password strength:</span>
            <span className={`font-medium ${
              passwordStrength.strength <= 2 ? 'text-red-600' :
              passwordStrength.strength <= 3 ? 'text-yellow-600' :
              passwordStrength.strength <= 4 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {passwordStrength.label}
            </span>
          </div>
          <div className="mt-1 h-2 bg-gray-200 rounded-full">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
              style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};