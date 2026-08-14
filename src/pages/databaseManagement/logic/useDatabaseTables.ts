// src/pages/databaseManagement/logic/useDatabaseTables.ts
import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getTables, type DatabaseTable } from '../../../services/databaseManagement';

export function useDatabaseTables() {
  const { getAccessToken } = useAuthContext();
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      const data = await getTables(token);
      setTables(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load database tables');
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  return { tables, isLoading, error, reload: loadTables };
}
