import React from 'react';
import { Routes, Route } from 'react-router-dom';
import EstimatesHome from './EstimatesHome';
import EstimateDashboard from './components/estimateDashboard/EstimateDashboard';
import { EstimateCreationForm } from './components/EstimateCreationForm';

/**
 * Main Estimates component that handles routing between:
 * - /estimates - List view (EstimatesHome)
 * - /estimates/new - Creation form (EstimateCreationForm) - supports Change Orders via query params
 * - /estimates/:estimateId - Dashboard view (EstimateDashboard)
 */
const Estimates: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<EstimatesHome />} />
      <Route path="/new" element={<EstimateCreationForm />} />
      <Route path="/:estimateId" element={<EstimateDashboard />} />
    </Routes>
  );
};

export default Estimates;