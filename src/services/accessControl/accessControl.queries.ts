// src/services/accessControl/accessControl.queries.ts
import { apiRequest } from './accessControl.api';
import type { AccessControlUser, FeatureDefinition, MyPermissions, PageDefinition, Role } from './accessControl.types';

export function getUsers(accessToken: string): Promise<AccessControlUser[]> {
  return apiRequest('/users', accessToken);
}

export function getMyPermissions(accessToken: string): Promise<MyPermissions> {
  return apiRequest('/users/me', accessToken);
}

export function getRoles(accessToken: string): Promise<Role[]> {
  return apiRequest('/roles', accessToken);
}

export function getPages(accessToken: string): Promise<PageDefinition[]> {
  return apiRequest('/roles/pages', accessToken);
}

export function getFeatures(accessToken: string): Promise<FeatureDefinition[]> {
  return apiRequest('/roles/features', accessToken);
}
