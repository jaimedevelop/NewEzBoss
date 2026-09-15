// src/mainComponents/landing/FeaturesSection.tsx
import React from 'react';
import { 
  Wrench, 
  ClipboardList, 
  Calculator, 
  BarChart3, 
  Users, 
  Shield 
} from 'lucide-react';
import { FeatureCard } from './FeatureCard';

const features = [
  {
    icon: <ClipboardList className="w-8 h-8 text-orange-600" />,
    title: "Project Management",
    description: "Organize multiple projects with detailed tracking, customer information, and status updates."
  },
  {
    icon: <Wrench className="w-8 h-8 text-orange-600" />,
    title: "Inventory Tracking",
    description: "Manage tools, materials, and equipment with assignment tracking and availability monitoring."
  },
  {
    icon: <Calculator className="w-8 h-8 text-orange-600" />,
    title: "Estimates & Invoices",
    description: "Create professional estimates and invoices with automated calculations and PDF generation."
  },
  {
    icon: <BarChart3 className="w-8 h-8 text-orange-600" />,
    title: "Financial Overview",
    description: "Track project costs, pending payments, and profitability with comprehensive dashboards."
  },
  {
    icon: <Users className="w-8 h-8 text-orange-600" />,
    title: "Customer & Employee Management",
    description: "Store customer information and project history for better relationship management. Manage your employees for better efficiency."
  },
  {
    icon: <Shield className="w-8 h-8 text-orange-600" />,
    title: "Secure & Reliable",
    description: "Your data is protected with enterprise-grade security and automatic backups."
  }
];

export const FeaturesSection: React.FC = () => {
  return (
    <section
      className="relative py-20 overflow-hidden bg-white"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(250,252,255,0.95) 0%, rgba(244,248,255,0.95) 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute -left-24 top-14 h-64 w-64 opacity-25 blur-3xl rounded-full"
        style={{
          backgroundImage:
            'linear-gradient(120deg, rgba(255,255,255,0.75), rgba(168,180,200,0.45), rgba(92,108,132,0.35)), repeating-linear-gradient(90deg, rgba(255,255,255,0.45) 0px, rgba(180,193,213,0.22) 5px, rgba(90,104,128,0.48) 9px, rgba(180,193,213,0.22) 14px)'
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need to Run Your Business
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Built specifically for plumbing, electrical, HVAC, and other construction trades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
