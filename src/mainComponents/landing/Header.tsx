// src/mainComponents/landing/Header.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';

export const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-2">
            <Wrench className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-bold text-gray-900">EzBoss</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/landing/login')}
              className="text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/landing/signup')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};