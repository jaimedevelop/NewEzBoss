// src/pages/databaseManagement/views/DatabaseTableList.tsx
import React from 'react';
import { Table2 } from 'lucide-react';
import type { DatabaseTable } from '../../../services/databaseManagement';

interface DatabaseTableListProps {
  tables: DatabaseTable[];
  isLoading: boolean;
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
}

const DatabaseTableList: React.FC<DatabaseTableListProps> = ({
  tables,
  isLoading,
  selectedTable,
  onSelectTable,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
        Loading tables...
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
        No tables found.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <ul className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
        {tables.map((table) => {
          const isSelected = table.name === selectedTable;
          return (
            <li key={table.name}>
              <button
                onClick={() => onSelectTable(table.name)}
                className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors ${
                  isSelected ? 'bg-orange-50 border-l-4 border-orange-500' : 'hover:bg-gray-50 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Table2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-orange-500' : 'text-gray-400'}`} />
                  <span className={`truncate text-sm ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                    {table.name}
                  </span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{table.rowCount.toLocaleString()}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DatabaseTableList;
