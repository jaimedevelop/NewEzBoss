// src/pages/accessControl/logic/useAccessControlRoles.ts
import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import {
  createRole,
  getPages,
  getRoles,
  updateRole,
  type CreateRoleInput,
  type PageDefinition,
  type Role,
  type UpdateRoleInput,
} from '../../../services/accessControl';

export function useAccessControlRoles() {
  const { getAccessToken } = useAuthContext();
  const [roles, setRoles] = useState<Role[]>([]);
  const [pages, setPages] = useState<PageDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      const [rolesData, pagesData] = await Promise.all([getRoles(token), getPages(token)]);
      setRoles(rolesData);
      setPages(pagesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const addRole = useCallback(
    async (input: CreateRoleInput) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      await createRole(token, input);
      await loadRoles();
    },
    [getAccessToken, loadRoles]
  );

  const editRole = useCallback(
    async (roleId: number, input: UpdateRoleInput) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      await updateRole(token, roleId, input);
      await loadRoles();
    },
    [getAccessToken, loadRoles]
  );

  return { roles, pages, isLoading, error, reload: loadRoles, addRole, editRole };
}
