// src/pages/people/components/PeopleTabBar.tsx
import React from 'react';
import WorkspaceTabBar from '../../../mainComponents/ui/WorkspaceTabBar';
import { useAuthContext } from '../../../contexts/AuthContext';

type PeopleTab = 'clients' | 'employees' | 'other';

interface PeopleTabBarProps {
  activeTab: PeopleTab;
  onTabChange: (tab: PeopleTab) => void;
}

const PeopleTabBar: React.FC<PeopleTabBarProps> = ({ activeTab, onTabChange }) => {
  const { canAccessPage } = useAuthContext();

  const tabs = [
    { id: 'clients' as PeopleTab, label: 'Clients', disabled: !canAccessPage('clients') },
    { id: 'employees' as PeopleTab, label: 'Employees', disabled: !canAccessPage('employees') },
    { id: 'other' as PeopleTab, label: 'Other', disabled: true },
  ];

  return (
    <WorkspaceTabBar label="People" tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
  );
};

export default PeopleTabBar;
