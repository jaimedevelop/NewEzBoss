// src/mainComponents/landing/Footer.tsx
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/EzBossLogo2.png" alt="EzBoss logo" className="h-6 w-auto" />
            <span className="text-xl font-bold">EzBoss</span>
          </div>
          <p className="text-gray-400">
            © 2025 EzBoss. Built for construction professionals.
          </p>
        </div>
      </div>
    </footer>
  );
};
