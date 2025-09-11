// src/mainComponents/landing/TestimonialSection.tsx
import React from 'react';
import { Star } from 'lucide-react';

export const TestimonialSection: React.FC = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex justify-center mb-6">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
          ))}
        </div>
        <blockquote className="text-2xl font-medium text-gray-900 mb-6">
          "This CRM has completely transformed how we manage our plumbing projects. 
          What used to take hours now takes minutes."
        </blockquote>
        <div className="text-gray-600">
          <p className="font-semibold">Mike Rodriguez</p>
          <p>Rodriguez Plumbing Services</p>
        </div>
      </div>
    </section>
  );
};