// src/mainComponents/ui/CoolToggle.tsx
import React from 'react';

interface CoolToggleProps {
  leftLabel: string;
  rightLabel: string;
  value: string;
  leftValue: string;
  rightValue: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

const CoolToggle: React.FC<CoolToggleProps> = ({
  leftLabel,
  rightLabel,
  value,
  leftValue,
  rightValue,
  onChange,
  disabled = false,
  error = false
}) => {
  const isLeftSelected = value === leftValue;

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => !disabled && onChange(isLeftSelected ? rightValue : leftValue)}
        disabled={disabled}
        className={`
          relative w-full h-10 rounded-md overflow-hidden
          flex items-center justify-between
          transition-all duration-200
          ${error ? 'ring-2 ring-red-300' : 'ring-1 ring-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-blue-400'}
          bg-red-500
        `}
      >
        {/* Sliding green background over red base */}
        <div
          className={`
            absolute inset-0 w-1/2 bg-green-500 transition-transform duration-300 ease-in-out
            ${isLeftSelected ? 'translate-x-0' : 'translate-x-full'}
          `}
        />

        {/* Straight vertical separator line */}
        <div className="absolute inset-y-0 left-1/2 w-1 bg-white/90 transform -translate-x-1/2 z-10 shadow-sm" />

        {/* Left label */}
        <div
          className={`
            relative z-20 flex-1 text-center font-semibold transition-all duration-300
            ${isLeftSelected ? 'text-white scale-105' : 'text-white/60'}
          `}
        >
          {leftLabel}
        </div>

        {/* Right label */}
        <div
          className={`
            relative z-20 flex-1 text-center font-semibold transition-all duration-300
            ${!isLeftSelected ? 'text-white scale-105' : 'text-white/60'}
          `}
        >
          {rightLabel}
        </div>
      </button>
    </div>
  );
};

export default CoolToggle;
