// src/pages/databaseManagement/views/DatabaseRowsTable.tsx
import React from 'react';
import type { DatabaseTableRows } from '../../../services/databaseManagement';
import DatabaseColumnHeader from './DatabaseColumnHeader';

interface DatabaseRowsTableProps {
  tableName: string | null;
  data: DatabaseTableRows | null;
  isLoading: boolean;
  error: string | null;
}

const formatCell = (value: unknown) => {
  if (value === null || value === undefined) return <span className="text-gray-400">null</span>;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const DatabaseRowsTable: React.FC<DatabaseRowsTableProps> = ({ tableName, data, isLoading, error }) => {
  if (!tableName) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
        Select a table on the left to view its data.
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
        {error}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
        Loading rows...
      </div>
    );
  }

  if (data.rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
        This table has no rows.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto max-h-[70vh]">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              {data.columns.map((column) => (
                <DatabaseColumnHeader key={column.name} column={column} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {data.columns.map((column) => (
                  <td key={column.name} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                    {formatCell(row[column.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500">
        Showing {data.rows.length.toLocaleString()} of {data.rowCount.toLocaleString()} rows
      </div>
    </div>
  );
};

export default DatabaseRowsTable;
