// src/services/accessControl/accessControl.queries.ts
import { apiRequest } from './accessControl.api';
import type { AccessControlUser, PageDefinition, Role } from './accessControl.types';

export function getUsers(accessToken: string): Promise<AccessControlUser[]> {
  return apiRequest('/users', accessToken);
}

export function getRoles(accessToken: string): Promise<Role[]> {
  return apiRequest('/roles', accessToken);
}

export function getPages(accessToken: string): Promise<PageDefinition[]> {
  return apiRequest('/roles/pages', accessToken);
}
