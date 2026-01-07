// src/pages/employees/components/EmployeesFilter.tsx

import React from 'react';
import { Search } from 'lucide-react';

interface EmployeesFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const EmployeesFilter: React.FC<EmployeesFilterProps> = ({
  searchTerm,
  onSearchChange,
}) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        placeholder="Search employees by name..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />
    </div>
  );
};

export default EmployeesFilter;
