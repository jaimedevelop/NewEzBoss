// src/mainComponents/landing/HeroSection.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
          The Complete CRM for
          <span className="text-orange-600 block">Construction Professionals</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Streamline your projects, manage inventory, and create professional estimates 
          and invoices all in one powerful platform designed specifically for contractors.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => navigate('/landing/signup')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center"
          >
            Start Free Trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/landing/login')}
            className="border-2 border-gray-300 hover:border-orange-600 text-gray-700 hover:text-orange-600 px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
          >
            Watch Demo
          </button>
        </div>
      </div>
    </section>
  );
};