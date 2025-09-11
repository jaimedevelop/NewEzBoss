// src/mainComponents/landing/BenefitsSection.tsx
import React from 'react';
import { CheckCircle } from 'lucide-react';

const benefits = [
  "Reduce estimate creation time by 50%",
  "Never lose track of tools and materials",
  "Professional invoices that get paid faster",
  "Complete project history at your fingertips",
  "Mobile-responsive design for on-site access",
  "Streamlined workflows for daily operations"
];

export const BenefitsSection: React.FC = () => {
  return (
    <section className="py-20 bg-orange-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">
            See Results From Day One
          </h2>
          <p className="text-xl text-orange-100 max-w-2xl mx-auto">
            Join hundreds of contractors who have transformed their business operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <span className="text-white text-lg">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};