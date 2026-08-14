// src/services/databaseManagement/databaseManagement.types.ts

export interface DatabaseColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string | null;
}

export interface DatabaseTable {
  name: string;
  schema: string;
  rowCount: number;
  columns: DatabaseColumn[];
  sizeBytes: number | null;
  lastUpdated: string | null;
}

export interface DatabaseSearchResult {
  table: string;
  column: string;
  matchType: 'table' | 'column';
}

export interface DatabaseTableRows {
  columns: DatabaseColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  limit: number;
  offset: number;
}
