// src/services/accessControl/accessControl.types.ts

export interface PageDefinition {
  key: string;
  label: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  isSuperuser: boolean;
  isSystem: boolean;
  pageKeys: string[] | '*';
  createdAt: string;
  updatedAt: string;
}

export interface AccessControlUser {
  id: number;
  auth0Id: string;
  email: string;
  displayName: string | null;
  status: string;
  roleId: number | null;
  roleName: string | null;
  isSuperuser: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface MyPermissions {
  id: number;
  auth0Id: string;
  email: string;
  displayName: string | null;
  roleId: number | null;
  roleName: string | null;
  isSuperuser: boolean;
  pageKeys: string[] | '*';
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  pageKeys: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  pageKeys?: string[];
}
