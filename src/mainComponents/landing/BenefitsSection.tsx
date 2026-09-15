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
    <section className="relative py-20 bg-orange-600 overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/3 -top-16 h-64 w-64 opacity-25 blur-2xl rounded-full"
        style={{
          backgroundImage:
            'linear-gradient(140deg, rgba(255,255,255,0.55), rgba(233,190,112,0.38), rgba(120,100,80,0.3)), repeating-linear-gradient(90deg, rgba(255,255,255,0.28) 0px, rgba(255,214,150,0.22) 4px, rgba(123,109,88,0.42) 8px, rgba(255,214,150,0.22) 12px)'
        }}
      />
      <div
        className="pointer-events-none absolute right-[-6rem] bottom-[-4rem] h-72 w-72 opacity-25 blur-3xl rounded-full"
        style={{
          backgroundImage:
            'linear-gradient(120deg, rgba(255,255,255,0.38), rgba(255,229,170,0.32), rgba(126,110,89,0.24)), repeating-linear-gradient(90deg, rgba(255,255,255,0.25) 0px, rgba(248,190,110,0.2) 4px, rgba(120,103,77,0.36) 8px, rgba(248,190,110,0.2) 12px)'
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
