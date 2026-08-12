// src/services/accessControl/index.ts

export type {
  AccessControlUser,
  CreateRoleInput,
  PageDefinition,
  Role,
  UpdateRoleInput,
} from './accessControl.types';

export { getUsers, getRoles, getPages } from './accessControl.queries';
export { updateUserRole, createRole, updateRole } from './accessControl.mutations';
