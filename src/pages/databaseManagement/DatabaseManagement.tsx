// src/pages/databaseManagement/DatabaseManagement.tsx
import React, { useEffect, useState } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import VariableHeader from '../../mainComponents/ui/VariableHeader';
import DatabaseSearchBar from './views/DatabaseSearchBar';
import DatabaseTableList from './views/DatabaseTableList';
import DatabaseRowsTable from './views/DatabaseRowsTable';
import { useDatabaseTables } from './logic/useDatabaseTables';
import { useDatabaseSearch } from './logic/useDatabaseSearch';
import { useTableRows } from './logic/useTableRows';

const DatabaseManagement: React.FC = () => {
  const { tables, isLoading, error, reload } = useDatabaseTables();
  const { query, setQuery, filteredTables } = useDatabaseSearch(tables);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  useEffect(() => {
    if (selectedTable && !tables.some((t) => t.name === selectedTable)) {
      setSelectedTable(null);
    }
  }, [tables, selectedTable]);

  const { data: rowsData, isLoading: rowsLoading, error: rowsError } = useTableRows(selectedTable);

  return (
    <div className="space-y-8">
      <VariableHeader
        title="Database Management"
        subtitle="Oversee Postgres tables and columns during the migration"
        Icon={Database}
        rightAction={{
          label: 'Refresh',
          onClick: reload,
          Icon: RefreshCw,
        }}
      />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tables</h2>
          <p className="text-sm text-gray-600 mt-1">
            {tables.length} table{tables.length === 1 ? '' : 's'} in the database
          </p>
        </div>
        <div className="w-full max-w-sm">
          <DatabaseSearchBar value={query} onChange={setQuery} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        <DatabaseTableList
          tables={filteredTables}
          isLoading={isLoading}
          selectedTable={selectedTable}
          onSelectTable={setSelectedTable}
        />
        <DatabaseRowsTable
          tableName={selectedTable}
          data={rowsData}
          isLoading={rowsLoading}
          error={rowsError}
        />
      </div>
    </div>
  );
};

export default DatabaseManagement;
