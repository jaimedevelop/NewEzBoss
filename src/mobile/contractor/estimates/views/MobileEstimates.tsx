import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MobileEstimatesList from './MobileEstimatesList';
import MobileEstimateCreationForm from './MobileEstimateCreationForm';
import MobileEstimateDashboard from './MobileEstimateDashboard';

/**
 * Mobile contractor Estimates router, mirroring the desktop Estimates.tsx routes:
 * - /estimates       - list
 * - /estimates/new   - create (supports change orders via query params)
 * - /estimates/:id   - detail/dashboard
 */
const MobileEstimates: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MobileEstimatesList />} />
      <Route path="/new" element={<MobileEstimateCreationForm />} />
      <Route path="/:estimateId" element={<MobileEstimateDashboard />} />
    </Routes>
  );
};

export default MobileEstimates;
