// src/services/accessControl/accessControl.mutations.ts
import { apiRequest } from './accessControl.api';
import type { AccessControlUser, CreateRoleInput, Role, UpdateRoleInput } from './accessControl.types';

export function updateUserRole(
  accessToken: string,
  userId: number,
  roleId: number
): Promise<AccessControlUser> {
  return apiRequest(`/users/${userId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ roleId }),
  });
}

export function deleteUser(accessToken: string, userId: number): Promise<void> {
  return apiRequest(`/users/${userId}`, accessToken, {
    method: 'DELETE',
  });
}

export function createRole(accessToken: string, input: CreateRoleInput): Promise<Role> {
  return apiRequest('/roles', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateRole(
  accessToken: string,
  roleId: number,
  input: UpdateRoleInput
): Promise<void> {
  return apiRequest(`/roles/${roleId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteRole(accessToken: string, roleId: number): Promise<void> {
  return apiRequest(`/roles/${roleId}`, accessToken, {
    method: 'DELETE',
  });
}
