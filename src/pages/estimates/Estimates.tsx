import React from 'react';
import { Routes, Route } from 'react-router-dom';
import EstimatesHome from './EstimatesHome';
import EstimateDashboard from './components/estimateDashboard/EstimateDashboard';

/**
 * Main Estimates component that handles routing between:
 * - /estimates - List view (EstimatesHome)
 * - /estimates/:estimateId - Dashboard view (EstimateDashboard)
 */
const Estimates: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<EstimatesHome />} />
      <Route path="/:estimateId" element={<EstimateDashboard />} />
    </Routes>
  );
};

export default Estimates;