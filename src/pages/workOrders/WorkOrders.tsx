// src/pages/workOrders/WorkOrders.tsx

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import WorkOrdersHome from './WorkOrdersHome';
import WorkOrderDashboard from './components/WorkOrderDashboard';

/**
 * Main Work Orders component that handles routing between:
 * - /work-orders - List view (WorkOrdersHome)
 * - /work-orders/:woId - Dashboard view (WorkOrderDashboard)
 */
const WorkOrders: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<WorkOrdersHome />} />
            <Route path="/:woId" element={<WorkOrderDashboard />} />
        </Routes>
    );
};

export default WorkOrders;
