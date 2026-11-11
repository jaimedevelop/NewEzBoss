import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProjectsList from './ProjectsList';
import ProjectDashboard from './ProjectDashboard';
import { useAuthContext } from '../../contexts/AuthContext';

const Projects: React.FC = () => {
    const { currentUser, membershipId } = useAuthContext();
    return (
        <Routes key={`${currentUser?.uid}:${membershipId}`}>
            <Route index element={<ProjectsList />} />
            <Route path=":projectId" element={<ProjectDashboard />} />
        </Routes>
    );
};
export default Projects;
