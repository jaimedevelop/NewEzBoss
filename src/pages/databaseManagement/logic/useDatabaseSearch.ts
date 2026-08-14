// src/pages/databaseManagement/logic/useDatabaseSearch.ts
import { useMemo, useState } from 'react';
import type { DatabaseTable } from '../../../services/databaseManagement';

export function useDatabaseSearch(tables: DatabaseTable[]) {
  const [query, setQuery] = useState('');

  const filteredTables = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tables;

    return tables
      .map((table) => {
        const tableMatches = table.name.toLowerCase().includes(q);
        const matchingColumns = table.columns.filter((col) =>
          col.name.toLowerCase().includes(q)
        );

        if (!tableMatches && matchingColumns.length === 0) return null;

        return tableMatches ? table : { ...table, columns: matchingColumns };
      })
      .filter((table): table is DatabaseTable => table !== null);
  }, [tables, query]);

  return { query, setQuery, filteredTables };
}
