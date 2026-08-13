// src/services/accessControl/index.ts

export type {
  AccessControlUser,
  CreateRoleInput,
  MyPermissions,
  PageDefinition,
  Role,
  UpdateRoleInput,
} from './accessControl.types';

export { getUsers, getRoles, getPages, getMyPermissions } from './accessControl.queries';
export { updateUserRole, createRole, updateRole } from './accessControl.mutations';
