// src/pages/landing/Landing.tsx
'use client';

import React from 'react';
import { Header } from '../../mainComponents/landing/Header';
import { HeroSection } from '../../mainComponents/landing/HeroSection';
import { FeaturesSection } from '../../mainComponents/landing/FeaturesSection';
import { BenefitsSection } from '../../mainComponents/landing/BenefitsSection';
import { TestimonialSection } from '../../mainComponents/landing/TestimonialSection';
import { CTASection } from '../../mainComponents/landing/CTASection';
import { Footer } from '../../mainComponents/landing/Footer';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <TestimonialSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Landing;