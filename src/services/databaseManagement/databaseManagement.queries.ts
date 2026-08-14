// src/services/databaseManagement/databaseManagement.queries.ts
import { apiRequest } from '../accessControl/accessControl.api';
import type { DatabaseSearchResult, DatabaseTable } from './databaseManagement.types';

export function getTables(accessToken: string): Promise<DatabaseTable[]> {
  return apiRequest('/database-management/tables', accessToken);
}

export function searchDatabase(accessToken: string, query: string): Promise<DatabaseSearchResult[]> {
  return apiRequest(`/database-management/search?q=${encodeURIComponent(query)}`, accessToken);
}
