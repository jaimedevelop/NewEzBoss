import React from 'react';
import { Users } from 'lucide-react';

const PeopleHeader: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-sm text-white p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">People</h1>
            <p className="text-orange-100 text-lg">
              Manage clients, employees, and other contacts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeopleHeader;