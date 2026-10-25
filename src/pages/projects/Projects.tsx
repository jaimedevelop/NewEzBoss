import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProjectsList from './ProjectsList';
import ProjectDashboard from './ProjectDashboard';

const Projects: React.FC = () => (
    <Routes>
        <Route index element={<ProjectsList />} />
        <Route path=":projectId" element={<ProjectDashboard />} />
    </Routes>
);
export default Projects;
