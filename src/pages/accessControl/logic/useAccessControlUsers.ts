// src/pages/accessControl/logic/useAccessControlUsers.ts
import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getUsers, updateUserRole, type AccessControlUser } from '../../../services/accessControl';

export function useAccessControlUsers() {
  const { getAccessToken } = useAuthContext();
  const [users, setUsers] = useState<AccessControlUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      const data = await getUsers(token);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const changeUserRole = useCallback(
    async (userId: number, roleId: number) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      const updated = await updateUserRole(token, userId, roleId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      return updated;
    },
    [getAccessToken]
  );

  return { users, isLoading, error, reload: loadUsers, changeUserRole };
}
