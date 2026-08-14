// src/pages/databaseManagement/views/DatabaseColumnHeader.tsx
import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import type { DatabaseColumn } from '../../../services/databaseManagement';

interface DatabaseColumnHeaderProps {
  column: DatabaseColumn;
}

const DatabaseColumnHeader: React.FC<DatabaseColumnHeaderProps> = ({ column }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <th
      className="relative px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center gap-1.5 cursor-default">
        {column.isPrimaryKey && <KeyRound className="w-3.5 h-3.5 text-orange-500" />}
        {column.name}
      </div>

      {showTooltip && (
        <div className="absolute z-10 top-full left-0 mt-1 w-56 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 normal-case font-normal space-y-1.5">
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Type</span>
            <span className="text-right">{column.dataType}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Nullable</span>
            <span>{column.isNullable ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Default</span>
            <span className="text-right truncate max-w-[8rem]">{column.defaultValue ?? '—'}</span>
          </div>
          {column.isPrimaryKey && (
            <div className="flex items-center gap-1 text-orange-400 pt-1">
              <KeyRound className="w-3 h-3" />
              Primary key
            </div>
          )}
        </div>
      )}
    </th>
  );
};

export default DatabaseColumnHeader;
