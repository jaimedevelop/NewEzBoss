// src/pages/workOrders/WorkOrders.tsx

import React from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import WorkerWorkOrders from '../employee/WorkerWorkOrders';
import WorkOrdersHome from './WorkOrdersHome';
import WorkOrderDashboard from './components/WorkOrderDashboard';

/**
 * Main Work Orders component that handles routing between:
 * - /work-orders - List view (WorkOrdersHome)
 * - /work-orders/:woId - Dashboard view (WorkOrderDashboard)
 */
const WorkOrders: React.FC = () => {
    const { accountKind, canPerform, membershipId } = useAuthContext();
    const location = useLocation();
    const navigate = useNavigate();
    const management = canPerform('manage:work-orders');
    const worker = canPerform('assigned:work-orders');
    const ownView = !management || new URLSearchParams(location.search).get('view') === 'worker';
    if (ownView) return worker ? <div key={membershipId}>{management && <button className="secondary m-3" onClick={() => navigate('/work-orders')}>Open management</button>}<WorkerWorkOrders /></div> : <p className="p-6">Assigned work access is unavailable.</p>;
    return (<div>{accountKind === 'employee' && worker && <button className="secondary m-3" onClick={() => navigate('/work-orders?view=worker')}>Open my assigned work</button>}

        <Routes>
            <Route index element={<WorkOrdersHome />} />
            <Route path=":woId" element={<WorkOrderDashboard />} />
        </Routes></div>
    );
};

export default WorkOrders;
