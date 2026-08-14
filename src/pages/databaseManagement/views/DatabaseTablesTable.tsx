// src/pages/databaseManagement/views/DatabaseTablesTable.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, KeyRound } from 'lucide-react';
import type { DatabaseTable } from '../../../services/databaseManagement';

interface DatabaseTablesTableProps {
  tables: DatabaseTable[];
  isLoading: boolean;
}

const formatBytes = (bytes: number | null) => {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const DatabaseTablesTable: React.FC<DatabaseTablesTableProps> = ({ tables, isLoading }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (tableName: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) next.delete(tableName);
      else next.add(tableName);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
        Loading tables...
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
        No tables found.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-8" />
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Table</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Schema</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Row Count</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Columns</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Size</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tables.map((table) => {
            const isOpen = expanded.has(table.name);
            return (
              <React.Fragment key={table.name}>
                <tr
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleExpanded(table.name)}
                >
                  <td className="px-4 py-3">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{table.name}</td>
                  <td className="px-4 py-3 text-gray-600">{table.schema}</td>
                  <td className="px-4 py-3 text-gray-600">{table.rowCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{table.columns.length}</td>
                  <td className="px-4 py-3 text-gray-600">{formatBytes(table.sizeBytes)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {table.lastUpdated ? new Date(table.lastUpdated).toLocaleString() : '—'}
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={7} className="px-4 py-3 bg-gray-50">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs font-semibold text-gray-500 uppercase">
                            <th className="text-left py-1.5 pr-4">Column</th>
                            <th className="text-left py-1.5 pr-4">Type</th>
                            <th className="text-left py-1.5 pr-4">Nullable</th>
                            <th className="text-left py-1.5 pr-4">Default</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.columns.map((col) => (
                            <tr key={col.name} className="border-t border-gray-200">
                              <td className="py-1.5 pr-4 flex items-center gap-1.5 text-gray-900">
                                {col.isPrimaryKey && (
                                  <KeyRound className="w-3.5 h-3.5 text-orange-500" />
                                )}
                                {col.name}
                              </td>
                              <td className="py-1.5 pr-4 text-gray-600">{col.dataType}</td>
                              <td className="py-1.5 pr-4 text-gray-600">
                                {col.isNullable ? 'Yes' : 'No'}
                              </td>
                              <td className="py-1.5 pr-4 text-gray-600">
                                {col.defaultValue ?? '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DatabaseTablesTable;
