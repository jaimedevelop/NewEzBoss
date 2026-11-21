// src/pages/accessControl/views/AccessControlTabBar.tsx
import React from 'react';
import WorkspaceTabBar from '../../../mainComponents/ui/WorkspaceTabBar';

export type AccessControlTab = 'users' | 'roles';

interface AccessControlTabBarProps {
  activeTab: AccessControlTab;
  onTabChange: (tab: AccessControlTab) => void;
}

const AccessControlTabBar: React.FC<AccessControlTabBarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'users' as AccessControlTab, label: 'Users' },
    { id: 'roles' as AccessControlTab, label: 'Roles & Permissions' },
  ];

  return (
    <WorkspaceTabBar label="Access Control" tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
  );
};

export default AccessControlTabBar;
