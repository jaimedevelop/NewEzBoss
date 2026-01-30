// src/pages/projects/Projects.tsx

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProjectsList from './ProjectsList';
import ProjectDashboard from './ProjectDashboard';

/**
 * Main Projects component that handles routing between:
 * - /projects - List view (ProjectsList)
 * - /projects/:projectId - Dashboard view (ProjectDashboard)
 */
const Projects: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<ProjectsList />} />
            <Route path="/:projectId" element={<ProjectDashboard />} />
        </Routes>
    );
};

export default Projects;
