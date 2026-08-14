// src/pages/databaseManagement/logic/useTableRows.ts
import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getTableRows, type DatabaseTableRows } from '../../../services/databaseManagement';

export function useTableRows(tableName: string | null) {
  const { getAccessToken } = useAuthContext();
  const [data, setData] = useState<DatabaseTableRows | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    if (!tableName) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      const result = await getTableRows(token, tableName, { limit: 100, offset: 0 });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load table rows');
    } finally {
      setIsLoading(false);
    }
  }, [tableName, getAccessToken]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  return { data, isLoading, error, reload: loadRows };
}
